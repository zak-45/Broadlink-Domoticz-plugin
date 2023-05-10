function($scope, $rootScope, $location, $http, $interval, $route, $routeParams, deviceApi, permissions, livesocket) {

//
		var $element = $('#main-view #lightcontent').last();

		$scope.HasInitializedAddManualDialog = false;

		SetColValue = function (idx, color, brightness) {
			clearInterval($.setColValue);
			if (!permissions.hasPermission("User")) {
				HideNotify();
				ShowNotify($.t('You do not have permission to do that!'), 2500, true);
				return;
			}
			//TODO: Update local copy of device color instead of waiting for periodic AJAX poll of devices
			$.ajax({
				url: "json.htm?type=command&param=setcolbrightnessvalue&idx=" + idx + "&color=" + color + "&brightness=" + brightness,
				async: false,
				dataType: 'json'
			});
		};

		GetLightStatusText = function (item) {
			if (item.SubType == "Evohome") {
				return EvoDisplayTextMode(item.Status);
			}
			else if (item.SwitchType === "Selector") {
				return b64DecodeUnicode(item.LevelNames).split('|')[(item.LevelInt / 10)];
			}
			else
				return item.Status;
		}

		RefreshHardwareComboArray = function () {
			$.ComboHardware = [];
			$.ajax({
				url: "json.htm?type=command&param=getmanualhardware",
				async: false,
				dataType: 'json',
				success: function (data) {
					if (typeof data.result != 'undefined') {
						$.each(data.result, function (i, item) {
							$.ComboHardware.push({
								idx: item.idx,
								name: item.Name
							});
						});
					}
				}
			});
		}

		RefreshGpioComboArray = function () {
			$.ComboGpio = [];
			$.ajax({
				url: "json.htm?type=command&param=getgpio",
				async: false,
				dataType: 'json',
				success: function (data) {
					if (typeof data.result != 'undefined') {
						$.each(data.result, function (i, item) {
							$.ComboGpio.push({
								idx: item.idx,
								name: item.Name
							});
						});
					}
				}
			});
		}

		RefreshSysfsGpioComboArray = function () {
			$.ComboSysfsGpio = [];
			$.ajax({
				url: "json.htm?type=command&param=getsysfsgpio",
				async: false,
				dataType: 'json',
				success: function (data) {
					if (typeof data.result != 'undefined') {
						$.each(data.result, function (i, item) {
							$.ComboSysfsGpio.push({
								idx: item.idx,
								name: item.Name
							});
						});
					}
				}
			});
		}

		RefreshItem = function (item) {
			var id = "#lightcontent #" + item.idx;
			if ($(id + " #name").html() === undefined) {
				return; //idx not found
			}

			if ($(id + " #name").html() != item.Name) {
				$(id + " #name").html(item.Name);
			}
			var isdimmer = false;
			var img = "";
			var img2 = "";
			var img3 = "";
			var status = "";

			var bigtext = TranslateStatusShort(item.Status);
			if (item.UsedByCamera == true) {
				var streamimg = '<img src="images/webcam.png" title="' + $.t('Stream Video') + '" height="16" width="16">';
				var streamurl = "<a href=\"javascript:ShowCameraLiveStream('" + escape(item.Name) + "','" + item.CameraIdx + "')\">" + streamimg + "</a>";
				bigtext += "&nbsp;" + streamurl;
			}

			if (item.SubType == "Security Panel") {
				img = '<a href="secpanel/"><img src="images/security48.png" class="lcursor" height="48" width="48"></a>';
			}
			else if (item.SubType == "Evohome") {
				img = EvohomeImg(item);
				bigtext = GetLightStatusText(item);
			}
			else if (item.SwitchType == "X10 Siren") {
				if (
					(item.Status == 'On') ||
					(item.Status == 'Chime') ||
					(item.Status == 'Group On') ||
					(item.Status == 'All On')
				) {
					img = '<img src="images/siren-on.png" title="' + $.t("Turn Off") + '" onclick="SwitchLight(' + item.idx + ',\'Off\',' + item.Protected + ');" class="lcursor" height="48" width="48">';
				}
				else {
					img = '<img src="images/siren-off.png" title="' + $.t("Turn On") + '" onclick="SwitchLight(' + item.idx + ',\'On\',' + item.Protected + ');" class="lcursor" height="48" width="48">';
				}
			}
			else if (item.SwitchType == "Doorbell") {
				img = '<img src="images/doorbell48.png" title="' + $.t("Turn On") + '" onclick="SwitchLight(' + item.idx + ',\'On\',' + item.Protected + ');" class="lcursor" height="48" width="48">';
			}
			else if (item.SwitchType == "Push On Button") {
				img = '<img src="images/' + item.Image + '48_On.png" title="' + $.t("Turn On") + '" onclick="SwitchLight(' + item.idx + ',\'On\',' + item.Protected + ');" class="lcursor" height="48" width="48">';
			}
			else if (item.SwitchType == "Push Off Button") {
				img = '<img src="images/' + item.Image + '48_Off.png" title="' + $.t("Turn Off") + '" onclick="SwitchLight(' + item.idx + ',\'Off\',' + item.Protected + ');" class="lcursor" height="48" width="48">';
			}
			else if (item.SwitchType == "Door Contact") {
				if (item.InternalState == "Open") {
					img = '<img src="images/' + item.Image + '48_On.png" title="' + $.t(item.InternalState) + '" height="48" width="48">';
				}
				else {
					img = '<img src="images/' + item.Image + '48_Off.png" title="' + $.t(item.InternalState) + '" height="48" width="48">';
				}
			}
			else if (item.SwitchType == "Door Lock") {
				if (item.InternalState == "Unlocked") {
					img = '<img src="images/' + item.Image + '48_On.png" title="' + $.t("Lock") + '" onclick="SwitchLight(' + item.idx + ',\'On\',' + item.Protected + ');" class="lcursor" height="48" width="48">';
				}
				else {
					img = '<img src="images/' + item.Image + '48_Off.png" title="' + $.t("Unlock") + '" onclick="SwitchLight(' + item.idx + ',\'Off\',' + item.Protected + ');" class="lcursor" height="48" width="48">';
				}
			}
			else if (item.SwitchType == "Door Lock Inverted") {
				if (item.InternalState == "Unlocked") {
					img = '<img src="images/' + item.Image + '48_On.png" title="' + $.t("Lock") + '" onclick="SwitchLight(' + item.idx + ',\'Off\',' + item.Protected + ');" class="lcursor" height="48" width="48">';
				}
				else {
					img = '<img src="images/' + item.Image + '48_Off.png" title="' + $.t("Unlock") + '" onclick="SwitchLight(' + item.idx + ',\'On\',' + item.Protected + ');" class="lcursor" height="48" width="48">';
				}
			}
			else if (item.SwitchType == "Contact") {
				if (item.Status == 'Closed') {
					img = '<img src="images/' + item.Image + '48_Off.png" height="48" width="48">';
				}
				else {
					img = '<img src="images/' + item.Image + '48_On.png" height="48" width="48">';
				}
			}
			else if ((item.SwitchType == "Blinds") || (item.SwitchType.indexOf("Venetian Blinds") == 0)) {
				if (
					(item.SubType == "RAEX") ||
					(item.SubType.indexOf('A-OK') == 0) ||
					(item.SubType.indexOf('Hasta') >= 0) ||
					(item.SubType.indexOf('Media Mount') == 0) ||
					(item.SubType.indexOf('Forest') == 0) ||
					(item.SubType.indexOf('Chamberlain') == 0) ||
					(item.SubType.indexOf('Sunpery') == 0) ||
					(item.SubType.indexOf('Dolat') == 0) ||
					(item.SubType.indexOf('ASP') == 0) ||
					(item.SubType == "Harrison") ||
					(item.SubType.indexOf('RFY') == 0) ||
					(item.SubType.indexOf('ASA') == 0) ||
					(item.SubType.indexOf('DC106') == 0) ||
					(item.SubType.indexOf('Confexx') == 0) ||
					(item.SwitchType.indexOf("Venetian Blinds") == 0)
				) {
					if (item.Status == 'Closed') {
						img = '<img src="images/blindsopen48.png" title="' + $.t("Open Blinds") + '" onclick="SwitchLight(' + item.idx + ',\'Off\',' + item.Protected + ');" class="lcursor" height="48" width="48">';
						img3 = '<img src="images/blinds48sel.png" title="' + $.t("Close Blinds") + '" onclick="SwitchLight(' + item.idx + ',\'On\',' + item.Protected + ');" class="lcursor" height="48" width="48">';
					}
					else {
						img = '<img src="images/blindsopen48sel.png" title="' + $.t("Open Blinds") + '" onclick="SwitchLight(' + item.idx + ',\'Off\',' + item.Protected + ');" class="lcursor" height="48" width="48">';
						img3 = '<img src="images/blinds48.png" title="' + $.t("Close Blinds") + '" onclick="SwitchLight(' + item.idx + ',\'On\',' + item.Protected + ');" class="lcursor" height="48" width="48">';
					}
				}
				else {
					if (item.Status == 'Closed') {
						img = '<img src="images/blindsopen48.png" title="' + $.t("Open Blinds") + '" onclick="SwitchLight(' + item.idx + ',\'Off\',' + item.Protected + ');" class="lcursor" height="48" width="48">';
						img2 = '<img src="images/blinds48sel.png" title="' + $.t("Close Blinds") + '" onclick="SwitchLight(' + item.idx + ',\'On\',' + item.Protected + ');" class="lcursor" height="48" width="48">';
					}
					else {
						img = '<img src="images/blindsopen48sel.png" title="' + $.t("Open Blinds") + '" onclick="SwitchLight(' + item.idx + ',\'Off\',' + item.Protected + ');" class="lcursor" height="48" width="48">';
						img2 = '<img src="images/blinds48.png" title="' + $.t("Close Blinds") + '" onclick="SwitchLight(' + item.idx + ',\'On\',' + item.Protected + ');" class="lcursor" height="48" width="48">';
					}
				}
			}
			else if (item.SwitchType == "Blinds Inverted") {
				if (
					(item.SubType == "RAEX") ||
					(item.SubType.indexOf('A-OK') == 0) ||
					(item.SubType.indexOf('Hasta') >= 0) ||
					(item.SubType.indexOf('Media Mount') == 0) ||
					(item.SubType.indexOf('Forest') == 0) ||
					(item.SubType.indexOf('Chamberlain') == 0) ||
					(item.SubType.indexOf('Sunpery') == 0) ||
					(item.SubType.indexOf('Dolat') == 0) ||
					(item.SubType.indexOf('ASP') == 0) ||
					(item.SubType == "Harrison") ||
					(item.SubType.indexOf('RFY') == 0) ||
					(item.SubType.indexOf('ASA') == 0) ||
					(item.SubType.indexOf('DC106') == 0) ||
					(item.SubType.indexOf('Confexx') == 0)
				) {
					if (item.Status == 'Closed') {
						img = '<img src="images/blindsopen48.png" title="' + $.t("Open Blinds") + '" onclick="SwitchLight(' + item.idx + ',\'On\',' + item.Protected + ');" class="lcursor" height="48" width="48">';
						img3 = '<img src="images/blinds48sel.png" title="' + $.t("Close Blinds") + '" onclick="SwitchLight(' + item.idx + ',\'Off\',' + item.Protected + ');" class="lcursor" height="48" width="48">';
					}
					else {
						img = '<img src="images/blindsopen48sel.png" title="' + $.t("Open Blinds") + '" onclick="SwitchLight(' + item.idx + ',\'On\',' + item.Protected + ');" class="lcursor" height="48" width="48">';
						img3 = '<img src="images/blinds48.png" title="' + $.t("Close Blinds") + '" onclick="SwitchLight(' + item.idx + ',\'Off\',' + item.Protected + ');" class="lcursor" height="48" width="48">';
					}
				}
				else {
					if (item.Status == 'Closed') {
						img = '<img src="images/blindsopen48.png" title="' + $.t("Open Blinds") + '" onclick="SwitchLight(' + item.idx + ',\'On\',' + item.Protected + ');" class="lcursor" height="48" width="48">';
						img2 = '<img src="images/blinds48sel.png" title="' + $.t("Close Blinds") + '" onclick="SwitchLight(' + item.idx + ',\'Off\',' + item.Protected + ');" class="lcursor" height="48" width="48">';
					}
					else {
						img = '<img src="images/blindsopen48sel.png" title="' + $.t("Open Blinds") + '" onclick="SwitchLight(' + item.idx + ',\'On\',' + item.Protected + ');" class="lcursor" height="48" width="48">';
						img2 = '<img src="images/blinds48.png" title="' + $.t("Close Blinds") + '" onclick="SwitchLight(' + item.idx + ',\'Off\',' + item.Protected + ');" class="lcursor" height="48" width="48">';
					}
				}
			}
			else if (item.SwitchType == "Blinds Percentage") {
				isdimmer = true;
				if (item.Status == 'Open') {
					img = '<img src="images/blindsopen48sel.png" title="' + $.t("Open Blinds") + '" onclick="SwitchLight(' + item.idx + ',\'Off\',' + item.Protected + ');" class="lcursor" height="48">';
					img2 = '<img src="images/blinds48.png" title="' + $.t("Close Blinds") + '" onclick="SwitchLight(' + item.idx + ',\'On\',' + item.Protected + ');" class="lcursor" height="48">';
				}
				else {
					img = '<img src="images/blindsopen48.png" title="' + $.t("Open Blinds") + '" onclick="SwitchLight(' + item.idx + ',\'Off\',' + item.Protected + ');" class="lcursor" height="48">';
					img2 = '<img src="images/blinds48sel.png" title="' + $.t("Close Blinds") + '" onclick="SwitchLight(' + item.idx + ',\'On\',' + item.Protected + ');" class="lcursor" height="48">';
				}
			}
			else if (item.SwitchType == "Blinds Percentage Inverted") {
				isdimmer = true;
				if (item.Status == 'Closed') {
					img = '<img src="images/blindsopen48.png" title="' + $.t("Open Blinds") + '" onclick="SwitchLight(' + item.idx + ',\'On\',' + item.Protected + ');" class="lcursor" height="48">';
					img2 = '<img src="images/blinds48sel.png" title="' + $.t("Close Blinds") + '" onclick="SwitchLight(' + item.idx + ',\'Off\',' + item.Protected + ');" class="lcursor" height="48">';
				}
				else if ((item.Status == 'Open') || (item.Status.indexOf('Set ') == 0)) {
					img = '<img src="images/blindsopen48sel.png" title="' + $.t("Open Blinds") + '" onclick="SwitchLight(' + item.idx + ',\'On\',' + item.Protected + ');" class="lcursor" height="48">';
					img2 = '<img src="images/blinds48.png" title="' + $.t("Close Blinds") + '" onclick="SwitchLight(' + item.idx + ',\'Off\',' + item.Protected + ');" class="lcursor" height="48">';
				}
			}
			else if (item.SwitchType == "Smoke Detector") {
				if (
					(item.Status == 'Panic') ||
					(item.Status == 'On')
				) {
					img = '<img src="images/smoke48on.png" title="' + $.t("Turn Alarm On") + '" onclick="SwitchLight(' + item.idx + ',\'On\',' + item.Protected + ');" class="lcursor" height="48" width="48">';
					$(id + ' #resetbtn').attr("class", "btnsmall-sel");
				}
				else {
					img = '<img src="images/smoke48off.png" title="' + $.t("Turn Alarm On") + '" onclick="SwitchLight(' + item.idx + ',\'On\',' + item.Protected + ');" class="lcursor" height="48" width="48">';
					$(id + ' #resetbtn').attr("class", "btnsmall-dis");
				}

			}
			else if (item.Type == "Security") {
				if (item.SubType.indexOf('remote') > 0) {
					if ((item.Status.indexOf('Arm') >= 0) || (item.Status.indexOf('Panic') >= 0)) {
						img += '<img src="images/remote48.png" title="' + $.t("Turn Alarm Off") + '" onclick="SwitchLight(' + item.idx + ',\'Off\',' + item.Protected + ');" class="lcursor" height="48" width="48">\n';
					}
					else {
						img += '<img src="images/remote48.png" title="' + $.t("Turn Alarm On") + '" onclick="ArmSystem(' + item.idx + ',\'On\',' + item.Protected + ');" class="lcursor" height="48" width="48">\n';
					}
				}
				else if (item.SubType == "X10 security") {
					if (item.Status.indexOf('Normal') >= 0) {
						img += '<img src="images/security48.png" title="' + $.t("Turn Alarm On") + '" onclick="SwitchLight(' + item.idx + ',\'' + ((item.Status == "Normal Delayed") ? "Alarm Delayed" : "Alarm") + '\',' + item.Protected + ');" class="lcursor" height="48" width="48">';
					}
					else {
						img += '<img src="images/Alarm48_On.png" title="' + $.t("Turn Alarm Off") + '" onclick="SwitchLight(' + item.idx + ',\'' + ((item.Status == "Alarm Delayed") ? "Normal Delayed" : "Normal") + '\',' + item.Protected + ');" class="lcursor" height="48" width="48">';
					}
				}
				else if (item.SubType == "X10 security motion") {
					if ((item.Status == "No Motion")) {
						img += '<img src="images/security48.png" title="' + $.t("Turn Alarm On") + '" onclick="SwitchLight(' + item.idx + ',\'Motion\',' + item.Protected + ');" class="lcursor" height="48" width="48">';
					}
					else {
						img += '<img src="images/Alarm48_On.png" title="' + $.t("Turn Alarm Off") + '" onclick="SwitchLight(' + item.idx + ',\'No Motion\',' + item.Protected + ');" class="lcursor" height="48" width="48">';
					}
				}
				else if ((item.Status.indexOf('Alarm') >= 0) || (item.Status.indexOf('Tamper') >= 0)) {
					img = '<img src="images/Alarm48_On.png" height="48" width="48">';
				}
				else {
					if (item.SubType.indexOf('Meiantech') >= 0) {
						if ((item.Status.indexOf('Arm') >= 0) || (item.Status.indexOf('Panic') >= 0)) {
							img = '<img src="images/security48.png" title="' + $.t("Turn Alarm Off") + '" onclick="SwitchLight(' + item.idx + ',\'Off\',' + item.Protected + ');" class="lcursor" height="48" width="48">';
						}
						else {
							img = '<img src="images/security48.png" title="' + $.t("Turn Alarm On") + '" onclick="ArmSystemMeiantech(' + item.idx + ',\'On\',' + item.Protected + ');" class="lcursor" height="48" width="48">';
						}
					}
					else {
						if (item.SubType.indexOf('KeeLoq') >= 0) {
							img = '<img src="images/pushon48.png" title="' + $.t("Turn On") + '" onclick="SwitchLight(' + item.idx + ',\'On\',' + item.Protected + ');" class="lcursor" height="48" width="48">';
						}
						else {
							img = '<img src="images/security48.png" height="48" width="48">';
						}
					}
				}
			}
			else if (item.SwitchType == "Dimmer") {
				isdimmer = true;
				if (item.CustomImage == 0) item.Image = item.TypeImg;
				item.Image = item.Image.charAt(0).toUpperCase() + item.Image.slice(1);
				if (
					(item.Status == 'On') ||
					(item.Status == 'Chime') ||
					(item.Status == 'Group On') ||
					(item.Status.indexOf('Set ') == 0)
				) {
					if (isLED(item.SubType)) {
						img = '<img src="images/RGB48_On.png" onclick="ShowRGBWPopup(event, ' + item.idx + ',' + item.Protected + ',' + item.MaxDimLevel + ',' + item.LevelInt + ',\'' + item.Color.replace(/\"/g , '\&quot;') + '\',\'' + item.SubType + '\',\'' + item.DimmerType + '\');" class="lcursor" height="48" width="48">';
					}
					else {
						img = '<img src="images/' + item.Image + '48_On.png" title="' + $.t("Turn Off") + '" onclick="SwitchLight(' + item.idx + ',\'Off\',' + item.Protected + ');" class="lcursor" height="48" width="48">';
					}
				}
				else {
					if (isLED(item.SubType)) {
						img = '<img src="images/RGB48_Off.png" onclick="ShowRGBWPopup(event, ' + item.idx + ',' + item.Protected + ',' + item.MaxDimLevel + ',' + item.LevelInt + ',\'' + item.Color.replace(/\"/g , '\&quot;') + '\',\'' + item.SubType + '\',\'' + item.DimmerType + '\');" class="lcursor" height="48" width="48">';
					}
					else {
						img = '<img src="images/' + item.Image + '48_Off.png" title="' + $.t("Turn On") + '" onclick="SwitchLight(' + item.idx + ',\'On\',' + item.Protected + ');" class="lcursor" height="48" width="48">';
					}
				}
			}
			else if (item.SwitchType == "TPI") {
				var RO = (item.Unit < 64 || item.Unit > 95) ? true : false;
				isdimmer = true;
				if (
					(item.Status != 'Off')
				) {
					img = '<img src="images/Fireplace48_On.png" title="' + $.t(RO ? "On" : "Turn Off") + (RO ? '"' : '" onclick="SwitchLight(' + item.idx + ',\'Off\',' + item.Protected + ');" class="lcursor"') + ' height="48" width="48">';
				}
				else {
					img = '<img src="images/Fireplace48_Off.png" title="' + $.t(RO ? "Off" : "Turn On") + (RO ? '"' : '" onclick="SwitchLight(' + item.idx + ',\'On\',' + item.Protected + ');" class="lcursor"') + ' height="48" width="48">';
				}
			}
			else if (item.SwitchType == "Dusk Sensor") {
				if (
					(item.Status == 'On')
				) {
					img = '<img src="images/uvdark.png" title="' + $.t("Nighttime") + '" height="48" width="48">';
				}
				else {
					img = '<img src="images/uvsunny.png" title="' + $.t("Daytime") + '" height="48" width="48">';
				}
			}
			else if (item.SwitchType == "Media Player") {
				if (item.CustomImage == 0) item.Image = item.TypeImg;
				if (item.Status == 'Disconnected') {
					img = '<img src="images/' + item.Image + '48_Off.png" height="48" width="48">';
					img2 = '<img src="images/remote48.png" style="opacity:0.4"; height="48" width="48">';
				}
				else if ((item.Status != 'Off') && (item.Status != '0')) {
					img = '<img src="images/' + item.Image + '48_On.png" onclick="SwitchLight(' + item.idx + ',\'Off\',' + item.Protected + ');" class="lcursor" height="48" width="48">';
					img2 = '<img src="images/remote48.png" onclick="ShowMediaRemote(\'' + escape(item.Name) + "'," + item.idx + ",'" + item.HardwareType + '\');" class="lcursor" height="48" width="48">';
				}
				else {
					img = '<img src="images/' + item.Image + '48_Off.png" onclick="SwitchLight(' + item.idx + ',\'On\',' + item.Protected + ');" class="lcursor" height="48" width="48">';
					img2 = '<img src="images/remote48.png" style="opacity:0.4"; height="48" width="48">';
				}
				if (item.Status.length == 1) item.Status = "";
				status = item.Data;
				if (status == '0') status = "";
			}
			else if (item.SwitchType == "Motion Sensor") {
				if (
					(item.Status == 'On') ||
					(item.Status == 'Chime') ||
					(item.Status == 'Group On') ||
					(item.Status.indexOf('Set ') == 0)
				) {
					img = '<img src="images/motion48-on.png" height="48" width="48">';
				}
				else {
					img = '<img src="images/motion48-off.png" height="48" width="48">';
				}
			}
			else if (item.SwitchType === "Selector") {
				if ((item.Status === "Off")) {
					img += '<img src="images/' + item.Image + '48_Off.png" height="48" width="48">';
				} else if (item.LevelOffHidden) {
					img += '<img src="images/' + item.Image + '48_On.png" height="48" width="48">';
				} else {
					img += '<img src="images/' + item.Image + '48_On.png" title="' + $.t("Turn Off") + '" onclick="SwitchLight(' + item.idx + ',\'Off\',' + item.Protected + ');" class="lcursor" height="48" width="48">';
				}
			}
			else if (
				(item.SubType.indexOf("Itho") == 0) ||
				(item.SubType.indexOf("Lucci") == 0) ||
				(item.SubType.indexOf("Westinghouse") == 0)
				) {
				img = $(id + " #img").html();
			}
			else {
				if (
					(item.Status == 'On') ||
					(item.Status == 'Chime') ||
					(item.Status == 'Group On') ||
					(item.Status.indexOf('Down') != -1) ||
					(item.Status.indexOf('Up') != -1) ||
					(item.Status.indexOf('Set ') == 0)
				) {
					if (item.Type == "Thermostat 3") {
						img = '<img src="images/' + item.Image + '48_On.png" onclick="ShowTherm3Popup(event, ' + item.idx + ',' + item.Protected + ');" class="lcursor" height="48" width="48">';
					}
					else {
						img = '<img src="images/' + item.Image + '48_On.png" title="' + $.t("Turn Off") + '" onclick="SwitchLight(' + item.idx + ',\'Off\',' + item.Protected + ');" class="lcursor" height="48" width="48">';
					}
				}
				else {
					if (item.Type == "Thermostat 3") {
						img = '<img src="images/' + item.Image + '48_Off.png" onclick="ShowTherm3Popup(event, ' + item.idx + ',' + item.Protected + ');" class="lcursor" height="48" width="48">';
					}
					else {
						img = '<img src="images/' + item.Image + '48_Off.png" title="' + $.t("Turn On") + '" onclick="SwitchLight(' + item.idx + ',\'On\',' + item.Protected + ');" class="lcursor" height="48" width="48">';
					}
				}
			}

			var backgroundClass = $rootScope.GetItemBackgroundStatus(item);
			$(id).removeClass('statusNormal').removeClass('statusProtected').removeClass('statusTimeout').removeClass('statusLowBattery');
			$(id).addClass(backgroundClass);

			if ($(id + " #img").html() != img) {
				$(id + " #img").html(img);
			}
			if (img2 != "") {
				if ($(id + " #img2").html() != img2) {
					$(id + " #img2").html(img2);
				}
			}
			if (img3 != "") {
				if ($(id + " #img3").html() != img3) {
					$(id + " #img3").html(img3);
				}
			}
			if (isdimmer == true) {
				var dslider = $(id + " #slider");
				if (typeof dslider != 'undefined') {
					dslider.slider("value", item.LevelInt);
				}
			}
			if (item.SwitchType === "Selector") {
				var selector$ = $("#selector" + item.idx);
				if (typeof selector$ !== 'undefined') {
					if (item.SelectorStyle === 0) {
						var xhtm = '';
						var levelNames = b64DecodeUnicode(item.LevelNames).split('|');
						$.each(levelNames, function (index, levelName) {
							if ((index === 0) && (item.LevelOffHidden)) {
								return;
							}
							xhtm += '<button type="button" class="btn btn-small ';
							if ((index * 10) == item.LevelInt) {
								xhtm += 'btn-selected"';
							}
							else {
								xhtm += 'btn-default"';
							}
							xhtm += 'id="lSelector' + item.idx + 'Level' + index + '" name="selector' + item.idx + 'Level" value="' + (index * 10) + '" onclick="SwitchSelectorLevel(' + item.idx + ',\'' + unescape(levelName) + '\',' + (index * 10) + ',' + item.Protected + ');">' + levelName + '</button>';
						});
						selector$.html(xhtm);
					} else if (item.SelectorStyle === 1) {
						selector$.val(item.LevelInt);
						selector$.selectmenu('refresh');
					}
				}
				bigtext = GetLightStatusText(item);
			}
			if ($(id + " #bigtext").html() != TranslateStatus(GetLightStatusText(item))) {
				$(id + " #bigtext").html(bigtext);
			}
			if ((typeof $(id + " #status") != 'undefined') && ($(id + " #status").html() != status)) {
				$(id + " #status").html(status);
			}
			if ($(id + " #lastupdate").html() != item.LastUpdate) {
				$(id + " #lastupdate").html(item.LastUpdate);
			}

		}

		//We only call this once. After this the widgets are being updated automatically by used of the 'jsonupdate' broadcast event.
		RefreshLights = function () {
			livesocket.getJson("json.htm?type=devices&filter=light&used=true&rid=0&order=[Order]&lastupdate=" + $.LastUpdateTime + "&plan=" + window.myglobals.LastPlanSelected, function (data) {
				if (typeof data.ServerTime != 'undefined') {
					$rootScope.SetTimeAndSun(data.Sunrise, data.Sunset, data.ServerTime);
				}

				if (typeof data.result != 'undefined') {

					if (typeof data.ActTime != 'undefined') {
						$.LastUpdateTime = parseInt(data.ActTime);
					}

					/*
						Render all the widgets at once.
					*/
					$.each(data.result, function (i, item) {
						RefreshItem(item);
					});
				}
			});
		}

		ShowLights = function () {
			$('#modal').show();

			var htmlcontent = '';
			var bShowRoomplan = false;
			$.RoomPlans = [];
			$.ajax({
				url: "json.htm?type=plans",
				async: false,
				dataType: 'json',
				success: function (data) {
					if (typeof data.result != 'undefined') {
						var totalItems = data.result.length;
						if (totalItems > 0) {
							bShowRoomplan = true;
							//				if (window.myglobals.ismobile==true) {
							//				bShowRoomplan=false;
							//		}
							if (bShowRoomplan == true) {
								$.each(data.result, function (i, item) {
									$.RoomPlans.push({
										idx: item.idx,
										name: item.Name
									});
								});
							}
						}
					}
				}
			});

			var bHaveAddedDevider = false;

			var tophtm = "";
			if ($.RoomPlans.length == 0) {
				tophtm +=
					'\t<table border="0" cellpadding="0" cellspacing="0" width="100%">\n' +
					'\t<tr>\n' +
					'\t  <td align="left" valign="top" id="timesun"></td>\n' +
					'\t</tr>\n' +
					'\t</table>\n';
			}
			else {
				tophtm +=
					'\t<table border="0" cellpadding="0" cellspacing="0" width="100%">\n' +
					'\t<tr>\n' +
					'\t  <td align="left" valign="top" id="timesun"></td>\n' +
					'<td align="right" valign="top">' +
					'<span data-i18n="Room">Room</span>:&nbsp;<select id="comboroom" style="width:160px" class="combobox ui-corner-all">' +
					'<option value="0" data-i18n="All">All</option>' +
					'</select>' +
					'</td>' +
					'\t</tr>\n' +
					'\t</table>\n';
			}

			var i = 0;
			var j = 0;
			var roomPlanId = $routeParams.room || window.myglobals.LastPlanSelected;

			$.ajax({
				url: "json.htm?type=devices&filter=light&used=true&rid=0&order=[Order]&plan=" + roomPlanId,
				async: false,
				dataType: 'json',
				success: function (data) {

					if (typeof data.result != 'undefined') {
						if (typeof data.ActTime != 'undefined') {
							$.LastUpdateTime = parseInt(data.ActTime);
						}

						$.each(data.result, function (i, item) {
							if (j % 3 == 0) {
								//add devider
								if (bHaveAddedDevider == true) {
									//close previous devider
									htmlcontent += '</div>\n';
								}
								htmlcontent += '<div class="row divider">\n';
								bHaveAddedDevider = true;
							}
							var bAddTimer = true;
							var bIsDimmer = false;

							var backgroundClass = $rootScope.GetItemBackgroundStatus(item);

							var status = "";
							var xhtm =
								'\t<div class="item span4 ' + backgroundClass + '" id="' + item.idx + '">\n' +
								'\t  <section>\n';
							if ((item.SwitchType == "Blinds") || (item.SwitchType == "Blinds Inverted") || (item.SwitchType == "Blinds Percentage") || (item.SwitchType == "Blinds Percentage Inverted") || (item.SwitchType.indexOf("Venetian Blinds") == 0) || (item.SwitchType.indexOf("Media Player") == 0)) {
								if (
									(item.SubType == "RAEX") ||
									(item.SubType.indexOf('A-OK') == 0) ||
									(item.SubType.indexOf('Hasta') >= 0) ||
									(item.SubType.indexOf('Media Mount') == 0) ||
									(item.SubType.indexOf('Forest') == 0) ||
									(item.SubType.indexOf('Chamberlain') == 0) ||
									(item.SubType.indexOf('Sunpery') == 0) ||
									(item.SubType.indexOf('Dolat') == 0) ||
									(item.SubType.indexOf('ASP') == 0) ||
									(item.SubType == "Harrison") ||
									(item.SubType.indexOf('RFY') == 0) ||
									(item.SubType.indexOf('ASA') == 0) ||
									(item.SubType.indexOf('DC106') == 0) ||
									(item.SubType.indexOf('Confexx') == 0) ||
									(item.SwitchType.indexOf("Venetian Blinds") == 0)
								) {
									xhtm += '\t    <table id="itemtabletrippleicon" border="0" cellpadding="0" cellspacing="0">\n';
								}
								else {
									xhtm += '\t    <table id="itemtabledoubleicon" border="0" cellpadding="0" cellspacing="0">\n';
								}
							}
							else {
								xhtm += '\t    <table id="itemtablenostatus" border="0" cellpadding="0" cellspacing="0">\n';
							}

							xhtm +=
								'\t    <tr>\n' +
								'\t      <td id="name">' + item.Name + '</td>\n' +
								'\t      <td id="bigtext">';
							var bigtext = TranslateStatusShort(item.Status);
							if (item.SwitchType === "Selector" || item.SubType == "Evohome") {
								bigtext = GetLightStatusText(item);
							}
							if (item.UsedByCamera == true) {
								var streamimg = '<img src="images/webcam.png" title="' + $.t('Stream Video') + '" height="16" width="16">';
								var streamurl = "<a href=\"javascript:ShowCameraLiveStream('" + escape(item.Name) + "','" + item.CameraIdx + "')\">" + streamimg + "</a>";
								bigtext += "&nbsp;" + streamurl;
							}
							if (permissions.hasPermission("Admin")) {
								if (item.Type == "RFY") {
									var rfysetup = '<img src="images/devices.png" title="' + $.t('Setup') + '" height="16" width="16" onclick="ShowRFYPopup(event, ' + item.idx + ', ' + item.Protected + ', ' + window.myglobals.ismobile +');">';
									bigtext += "&nbsp;" + rfysetup;
								}
							}
							xhtm += bigtext + '</td>\n';
							if (item.SubType == "Security Panel") {
								xhtm += '\t      <td id="img"><a href="secpanel/"><img src="images/security48.png" class="lcursor" height="48" width="48"></a></td>\n';
							}
							else if (item.SubType == "Evohome") {
								xhtm += EvohomePopupMenu(item);
							}
							else if (item.SwitchType == "X10 Siren") {
								if (
									(item.Status == 'On') ||
									(item.Status == 'Chime') ||
									(item.Status == 'Group On') ||
									(item.Status == 'All On')
								) {
									xhtm += '\t      <td id="img"><img src="images/siren-on.png" title="' + $.t("Turn Off") + '" onclick="SwitchLight(' + item.idx + ',\'Off\',' + item.Protected + ');" class="lcursor" height="48" width="48"></td>\n';
								}
								else {
									xhtm += '\t      <td id="img"><img src="images/siren-off.png" title="' + $.t("Turn On") + '" onclick="SwitchLight(' + item.idx + ',\'On\',' + item.Protected + ');" class="lcursor" height="48" width="48"></td>\n';
								}
							}
							else if (item.SwitchType == "Doorbell") {
								xhtm += '\t      <td id="img"><img src="images/doorbell48.png" title="' + $.t("Turn On") + '" onclick="SwitchLight(' + item.idx + ',\'On\',' + item.Protected + ');" class="lcursor" height="48" width="48"></td>\n';
								bAddTimer = false;
							}
							else if (item.SwitchType == "Push On Button") {
								xhtm += '\t      <td id="img"><img src="images/' + item.Image + '48_On.png" title="' + $.t("Turn On") + '" onclick="SwitchLight(' + item.idx + ',\'On\',' + item.Protected + ');" class="lcursor" height="48" width="48"></td>\n';
							}
							else if (item.SwitchType == "Push Off Button") {
								xhtm += '\t      <td id="img"><img src="images/' + item.Image + '48_Off.png" title="' + $.t("Turn Off") + '" onclick="SwitchLight(' + item.idx + ',\'Off\',' + item.Protected + ');" class="lcursor" height="48" width="48"></td>\n';
							}
							else if (item.SwitchType == "Door Contact") {
								if (item.InternalState == "Open") {
                                    xhtm += '\t      <td id="img"><img src="images/' + item.Image + '48_On.png" title="' + $.t(item.InternalState) + '" height="48" width="48"></td>\n';
								}
								else {
                                    xhtm += '\t      <td id="img"><img src="images/' + item.Image + '48_Off.png" title="' + $.t(item.InternalState) + '" height="48" width="48"></td>\n';
								}
								bAddTimer = false;
							}
							else if (item.SwitchType == "Door Lock") {
								if (item.InternalState == "Unlocked") {
									xhtm += '\t      <td id="img"><img src="images/' + item.Image + '48_On.png" title="' + $.t("Lock") + '" onclick="SwitchLight(' + item.idx + ',\'On\',' + item.Protected + ');" class="lcursor" height="48" width="48"></td>\n';
								}
								else {
									xhtm += '\t      <td id="img"><img src="images/' + item.Image + '48_Off.png" title="' + $.t("Unlock") + '" onclick="SwitchLight(' + item.idx + ',\'Off\',' + item.Protected + ');" class="lcursor" height="48" width="48"></td>\n';
								}
								bAddTimer = false;
							}
							else if (item.SwitchType == "Door Lock Inverted") {
								if (item.InternalState == "Unlocked") {
									xhtm += '\t      <td id="img"><img src="images/' + item.Image + '48_On.png" title="' + $.t("Lock") + '" onclick="SwitchLight(' + item.idx + ',\'Off\',' + item.Protected + ');" class="lcursor" height="48" width="48"></td>\n';
								}
								else {
									xhtm += '\t      <td id="img"><img src="images/' + item.Image + '48_Off.png" title="' + $.t("Unlock") + '" onclick="SwitchLight(' + item.idx + ',\'On\',' + item.Protected + ');" class="lcursor" height="48" width="48"></td>\n';
								}
								bAddTimer = false;
							}
							else if (item.SwitchType == "Contact") {
								if (item.Status == 'Closed') {
									xhtm += '\t      <td id="img"><img src="images/' + item.Image + '48_Off.png" height="48" width="48"></td>\n';
								}
								else {
									xhtm += '\t      <td id="img"><img src="images/' + item.Image + '48_On.png" height="48" width="48"></td>\n';
								}
								bAddTimer = false;
							}
							else if (item.SwitchType == "Media Player") {
								if (item.CustomImage == 0) item.Image = item.TypeImg;
								if (item.Status == 'Disconnected') {
									xhtm += '\t      <td id="img"><img src="images/' + item.Image + '48_Off.png" height="48" width="48"></td>\n';
									xhtm += '\t      <td id="img2"><img src="images/remote48.png" style="opacity:0.4"; height="48" width="48"></td>\n';
								}
								else if ((item.Status != 'Off') && (item.Status != '0')) {
									xhtm += '\t      <td id="img"><img src="images/' + item.Image + '48_On.png" onclick="SwitchLight(' + item.idx + ',\'Off\',' + item.Protected + ');" class="lcursor" height="48" width="48"></td>\n';
									xhtm += '\t      <td id="img2"><img src="images/remote48.png" onclick="ShowMediaRemote(\'' + escape(item.Name) + "'," + item.idx + ",'" + item.HardwareType + '\');" class="lcursor" height="48" width="48"></td>\n';
								}
								else {
									xhtm += '\t      <td id="img"><img src="images/' + item.Image + '48_Off.png" onclick="SwitchLight(' + item.idx + ',\'On\',' + item.Protected + ');" class="lcursor" height="48" width="48"></td>\n';
									xhtm += '\t      <td id="img2"><img src="images/remote48.png" style="opacity:0.4"; height="48" width="48"></td>\n';
								}
								if (item.Status.length == 1) item.Status = "";
								status = item.Data;
								bAddTimer = false;
							}
							else if ((item.SwitchType == "Blinds") || (item.SwitchType.indexOf("Venetian Blinds") == 0)) {
								if (
									(item.SubType == "RAEX") ||
									(item.SubType.indexOf('A-OK') == 0) ||
									(item.SubType.indexOf('Hasta') >= 0) ||
									(item.SubType.indexOf('Media Mount') == 0) ||
									(item.SubType.indexOf('Forest') == 0) ||
									(item.SubType.indexOf('Chamberlain') == 0) ||
									(item.SubType.indexOf('Sunpery') == 0) ||
									(item.SubType.indexOf('Dolat') == 0) ||
									(item.SubType.indexOf('ASP') == 0) ||
									(item.SubType == "Harrison") ||
									(item.SubType.indexOf('RFY') == 0) ||
									(item.SubType.indexOf('ASA') == 0) ||
									(item.SubType.indexOf('DC106') == 0) ||
									(item.SubType.indexOf('Confexx') == 0) ||
									(item.SwitchType.indexOf("Venetian Blinds") == 0)
								) {
									if (item.Status == 'Closed') {
										xhtm += '\t      <td id="img"><img src="images/blindsopen48.png" title="' + $.t("Open Blinds") + '" onclick="SwitchLight(' + item.idx + ',\'Off\',' + item.Protected + ');" class="lcursor" height="48" width="48"></td>\n';
										xhtm += '\t      <td id="img2"><img src="images/blindsstop.png" title="' + $.t("Stop Blinds") + '" onclick="SwitchLight(' + item.idx + ',\'Stop\',' + item.Protected + ');" class="lcursor" height="48" width="24"></td>\n';
										xhtm += '\t      <td id="img3"><img src="images/blinds48sel.png" title="' + $.t("Close Blinds") + '" onclick="SwitchLight(' + item.idx + ',\'On\',' + item.Protected + ');" class="lcursor" height="48" width="48"></td>\n';
									}
									else {
										xhtm += '\t      <td id="img"><img src="images/blindsopen48sel.png" title="' + $.t("Open Blinds") + '" onclick="SwitchLight(' + item.idx + ',\'Off\',' + item.Protected + ');" class="lcursor" height="48" width="48"></td>\n';
										xhtm += '\t      <td id="img2"><img src="images/blindsstop.png" title="' + $.t("Stop Blinds") + '" onclick="SwitchLight(' + item.idx + ',\'Stop\',' + item.Protected + ');" class="lcursor" height="48" width="24"></td>\n';
										xhtm += '\t      <td id="img3"><img src="images/blinds48.png" title="' + $.t("Close Blinds") + '" onclick="SwitchLight(' + item.idx + ',\'On\',' + item.Protected + ');" class="lcursor" height="48" width="48"></td>\n';
									}
								}
								else {
									if (item.Status == 'Closed') {
										xhtm += '\t      <td id="img"><img src="images/blindsopen48.png" title="' + $.t("Open Blinds") + '" onclick="SwitchLight(' + item.idx + ',\'Off\',' + item.Protected + ');" class="lcursor" height="48" width="48"></td>\n';
										xhtm += '\t      <td id="img2"><img src="images/blinds48sel.png" title="' + $.t("Close Blinds") + '" onclick="SwitchLight(' + item.idx + ',\'On\',' + item.Protected + ');" class="lcursor" height="48" width="48"></td>\n';
									}
									else {
										xhtm += '\t      <td id="img"><img src="images/blindsopen48sel.png" title="' + $.t("Open Blinds") + '" onclick="SwitchLight(' + item.idx + ',\'Off\',' + item.Protected + ');" class="lcursor" height="48" width="48"></td>\n';
										xhtm += '\t      <td id="img2"><img src="images/blinds48.png" title="' + $.t("Close Blinds") + '" onclick="SwitchLight(' + item.idx + ',\'On\',' + item.Protected + ');" class="lcursor" height="48" width="48"></td>\n';
									}
								}
							}
							else if (item.SwitchType == "Blinds Inverted") {
								if (
									(item.SubType == "RAEX") ||
									(item.SubType.indexOf('A-OK') == 0) ||
									(item.SubType.indexOf('Hasta') >= 0) ||
									(item.SubType.indexOf('Media Mount') == 0) ||
									(item.SubType.indexOf('Forest') == 0) ||
									(item.SubType.indexOf('Chamberlain') == 0) ||
									(item.SubType.indexOf('Sunpery') == 0) ||
									(item.SubType.indexOf('Dolat') == 0) ||
									(item.SubType.indexOf('ASP') == 0) ||
									(item.SubType == "Harrison") ||
									(item.SubType.indexOf('RFY') == 0) ||
									(item.SubType.indexOf('ASA') == 0) ||
									(item.SubType.indexOf('DC106') == 0) ||
									(item.SubType.indexOf('Confexx') == 0)
								) {
									if (item.Status == 'Closed') {
										xhtm += '\t      <td id="img"><img src="images/blindsopen48.png" title="' + $.t("Open Blinds") + '" onclick="SwitchLight(' + item.idx + ',\'On\',' + item.Protected + ');" class="lcursor" height="48" width="48"></td>\n';
										xhtm += '\t      <td id="img2"><img src="images/blindsstop.png" title="' + $.t("Stop Blinds") + '" onclick="SwitchLight(' + item.idx + ',\'Stop\',' + item.Protected + ');" class="lcursor" height="48" width="24"></td>\n';
										xhtm += '\t      <td id="img3"><img src="images/blinds48sel.png" title="' + $.t("Close Blinds") + '" onclick="SwitchLight(' + item.idx + ',\'Off\',' + item.Protected + ');" class="lcursor" height="48" width="48"></td>\n';
									}
									else {
										xhtm += '\t      <td id="img"><img src="images/blindsopen48sel.png" title="' + $.t("Open Blinds") + '" onclick="SwitchLight(' + item.idx + ',\'On\',' + item.Protected + ');" class="lcursor" height="48" width="48"></td>\n';
										xhtm += '\t      <td id="img2"><img src="images/blindsstop.png" title="' + $.t("Stop Blinds") + '" onclick="SwitchLight(' + item.idx + ',\'Stop\',' + item.Protected + ');" class="lcursor" height="48" width="24"></td>\n';
										xhtm += '\t      <td id="img3"><img src="images/blinds48.png" title="' + $.t("Close Blinds") + '" onclick="SwitchLight(' + item.idx + ',\'Off\',' + item.Protected + ');" class="lcursor" height="48" width="48"></td>\n';
									}
								}
								else {
									if (item.Status == 'Closed') {
										xhtm += '\t      <td id="img"><img src="images/blindsopen48.png" title="' + $.t("Open Blinds") + '" onclick="SwitchLight(' + item.idx + ',\'On\',' + item.Protected + ');" class="lcursor" height="48" width="48"></td>\n';
										xhtm += '\t      <td id="img2"><img src="images/blinds48sel.png" title="' + $.t("Close Blinds") + '" onclick="SwitchLight(' + item.idx + ',\'Off\',' + item.Protected + ');" class="lcursor" height="48" width="48"></td>\n';
									}
									else {
										xhtm += '\t      <td id="img"><img src="images/blindsopen48sel.png" title="' + $.t("Open Blinds") + '" onclick="SwitchLight(' + item.idx + ',\'On\',' + item.Protected + ');" class="lcursor" height="48" width="48"></td>\n';
										xhtm += '\t      <td id="img2"><img src="images/blinds48.png" title="' + $.t("Close Blinds") + '" onclick="SwitchLight(' + item.idx + ',\'Off\',' + item.Protected + ');" class="lcursor" height="48" width="48"></td>\n';
									}
								}
							}
							else if (item.SwitchType == "Blinds Percentage") {
								bIsDimmer = true;
								if (item.Status == 'Open') {
									xhtm += '\t      <td id="img"><img src="images/blindsopen48sel.png" title="' + $.t("Open Blinds") + '" onclick="SwitchLight(' + item.idx + ',\'Off\',' + item.Protected + ');" class="lcursor" height="48"></td>\n';
									xhtm += '\t      <td id="img2"><img src="images/blinds48.png" title="' + $.t("Close Blinds") + '" onclick="SwitchLight(' + item.idx + ',\'On\',' + item.Protected + ');" class="lcursor" height="48"></td>\n';
								}
								else {
									xhtm += '\t      <td id="img"><img src="images/blindsopen48.png" title="' + $.t("Open Blinds") + '" onclick="SwitchLight(' + item.idx + ',\'Off\',' + item.Protected + ');" class="lcursor" height="48"></td>\n';
									xhtm += '\t      <td id="img2"><img src="images/blinds48sel.png" title="' + $.t("Close Blinds") + '" onclick="SwitchLight(' + item.idx + ',\'On\',' + item.Protected + ');" class="lcursor" height="48"></td>\n';
								}
							}
							else if (item.SwitchType == "Blinds Percentage Inverted") {
								bIsDimmer = true;
								if (item.Status == 'Closed') {
									xhtm += '\t	  <td id="img"><img src="images/blindsopen48.png" title="' + $.t("Open Blinds") + '" onclick="SwitchLight(' + item.idx + ',\'On\',' + item.Protected + ');" class="lcursor" height="48"></td>\n';
									xhtm += '\t	  <td id="img2"><img src="images/blinds48sel.png" title="' + $.t("Close Blinds") + '" onclick="SwitchLight(' + item.idx + ',\'Off\',' + item.Protected + ');" class="lcursor" height="48"></td>\n';
								}
								else {
									xhtm += '\t	  <td id="img"><img src="images/blindsopen48sel.png" title="' + $.t("Open Blinds") + '" onclick="SwitchLight(' + item.idx + ',\'On\',' + item.Protected + ');" class="lcursor" height="48"></td>\n';
									xhtm += '\t	  <td id="img2"><img src="images/blinds48.png" title="' + $.t("Close Blinds") + '" onclick="SwitchLight(' + item.idx + ',\'Off\',' + item.Protected + ');" class="lcursor" height="48"></td>\n';
								}
							}
							else if (item.SwitchType == "Smoke Detector") {
								if (
									(item.Status == 'Panic') ||
									(item.Status == 'On')
								) {
									xhtm += '\t      <td id="img"><img src="images/smoke48on.png" title="' + $.t("Turn Alarm On") + '" onclick="SwitchLight(' + item.idx + ',\'On\',' + item.Protected + ');" class="lcursor" height="48" width="48"></td>\n';
								}
								else {
									xhtm += '\t      <td id="img"><img src="images/smoke48off.png" title="' + $.t("Turn Alarm On") + '" onclick="SwitchLight(' + item.idx + ',\'On\',' + item.Protected + ');" class="lcursor" height="48" width="48"></td>\n';
								}
							}
							else if (item.Type == "Security") {
								if (item.SubType.indexOf('remote') > 0) {
									if ((item.Status.indexOf('Arm') >= 0) || (item.Status.indexOf('Panic') >= 0)) {
										xhtm += '\t      <td id="img"><img src="images/remote48.png" title="' + $.t("Turn Alarm Off") + '" onclick="SwitchLight(' + item.idx + ',\'Off\',' + item.Protected + ');" class="lcursor" height="48" width="48"></td>\n';
									}
									else {
										xhtm += '\t      <td id="img"><img src="images/remote48.png" title="' + $.t("Turn Alarm On") + '" onclick="ArmSystem(' + item.idx + ',\'On\',' + item.Protected + ');" class="lcursor" height="48" width="48"></td>\n';
									}
								}
								else if (item.SubType == "X10 security") {
									if (item.Status.indexOf('Normal') >= 0) {
										xhtm += '\t      <td id="img"><img src="images/security48.png" title="' + $.t("Turn Alarm On") + '" onclick="SwitchLight(' + item.idx + ',\'' + ((item.Status == "Normal Delayed") ? "Alarm Delayed" : "Alarm") + '\',' + item.Protected + ');" class="lcursor" height="48" width="48"></td>\n';
									}
									else {
										xhtm += '\t      <td id="img"><img src="images/Alarm48_On.png" title="' + $.t("Turn Alarm Off") + '" onclick="SwitchLight(' + item.idx + ',\'' + ((item.Status == "Alarm Delayed") ? "Normal Delayed" : "Normal") + '\',' + item.Protected + ');" class="lcursor" height="48" width="48"></td>\n';
									}
								}
								else if (item.SubType == "X10 security motion") {
									if ((item.Status == "No Motion")) {
										xhtm += '\t      <td id="img"><img src="images/security48.png" title="' + $.t("Turn Alarm On") + '" onclick="SwitchLight(' + item.idx + ',\'Motion\',' + item.Protected + ');" class="lcursor" height="48" width="48"></td>\n';
									}
									else {
										xhtm += '\t      <td id="img"><img src="images/Alarm48_On.png" title="' + $.t("Turn Alarm Off") + '" onclick="SwitchLight(' + item.idx + ',\'No Motion\',' + item.Protected + ');" class="lcursor" height="48" width="48"></td>\n';
									}
								}
								else if ((item.Status.indexOf('Alarm') >= 0) || (item.Status.indexOf('Tamper') >= 0)) {
									xhtm += '\t      <td id="img"><img src="images/Alarm48_On.png" height="48" width="48"></td>\n';
								}
								else {
									if (item.SubType.indexOf('Meiantech') >= 0) {
										if ((item.Status.indexOf('Arm') >= 0) || (item.Status.indexOf('Panic') >= 0)) {
											xhtm += '\t      <td id="img"><img src="images/security48.png" title="' + $.t("Turn Alarm Off") + '" onclick="SwitchLight(' + item.idx + ',\'Off\',' + item.Protected + ');" class="lcursor" height="48" width="48"></td>\n';
										}
										else {
											xhtm += '\t      <td id="img"><img src="images/security48.png" title="' + $.t("Turn Alarm On") + '" onclick="ArmSystemMeiantech(' + item.idx + ',\'On\',' + item.Protected + ');" class="lcursor" height="48" width="48"></td>\n';
										}
									}
									else {
										if (item.SubType.indexOf('KeeLoq') >= 0) {
											xhtm += '\t      <td id="img"><img src="images/pushon48.png" title="' + $.t("Turn On") + '" onclick="SwitchLight(' + item.idx + ',\'On\',' + item.Protected + ');" class="lcursor" height="48" width="48"></td>\n';
										}
										else {
											xhtm += '\t      <td id="img"><img src="images/security48.png" height="48" width="48"></td>\n';
										}
									}
								}
								bAddTimer = false;
							}
							else if (item.SwitchType == "Dimmer") {
								bIsDimmer = true;
								if (item.CustomImage == 0) item.Image = item.TypeImg;
								item.Image = item.Image.charAt(0).toUpperCase() + item.Image.slice(1);
								if (
									(item.Status == 'On') ||
									(item.Status == 'Chime') ||
									(item.Status == 'Group On') ||
									(item.Status.indexOf('Set ') == 0) ||
									(item.Status.indexOf('NightMode') == 0) ||
									(item.Status.indexOf('Disco ') == 0)
								) {
									if (isLED(item.SubType)) {
										xhtm += '\t      <td id="img"><img src="images/RGB48_On.png" onclick="ShowRGBWPopup(event, ' + item.idx + ',' + item.Protected + ',' + item.MaxDimLevel + ',' + item.LevelInt + ',\'' + item.Color.replace(/\"/g , '\&quot;') + '\',\'' + item.SubType + '\',\'' + item.DimmerType + '\');" class="lcursor" height="48" width="48"></td>\n';
									}
									else {
										xhtm += '\t      <td id="img"><img src="images/' + item.Image + '48_On.png" title="' + $.t("Turn Off") + '" onclick="SwitchLight(' + item.idx + ',\'Off\',' + item.Protected + ');" class="lcursor" height="48" width="48"></td>\n';
									}
								}
								else {
									if (isLED(item.SubType)) {
										xhtm += '\t      <td id="img"><img src="images/RGB48_Off.png" onclick="ShowRGBWPopup(event, ' + item.idx + ',' + item.Protected + ',' + item.MaxDimLevel + ',' + item.LevelInt + ',\'' + item.Color.replace(/\"/g , '\&quot;') + '\',\'' + item.SubType + '\',\'' + item.DimmerType + '\');" class="lcursor" height="48" width="48"></td>\n';
									}
									else {
										xhtm += '\t      <td id="img"><img src="images/' + item.Image + '48_Off.png" title="' + $.t("Turn On") + '" onclick="SwitchLight(' + item.idx + ',\'On\',' + item.Protected + ');" class="lcursor" height="48" width="48"></td>\n';
									}
								}
							}
							else if (item.SwitchType == "TPI") {
								var RO = (item.Unit < 64 || item.Unit > 95) ? true : false;
								bIsDimmer = true;
								if (item.Status != 'Off') {
									xhtm += '\t      <td id="img"><img src="images/Fireplace48_On.png" title="' + $.t(RO ? "On" : "Turn Off") + (RO ? '"' : '" onclick="SwitchLight(' + item.idx + ',\'Off\',' + item.Protected + ');" class="lcursor"') + ' height="48" width="48"></td>\n';
								}
								else {
									xhtm += '\t      <td id="img"><img src="images/Fireplace48_Off.png" title="' + $.t(RO ? "Off" : "Turn On") + (RO ? '"' : '" onclick="SwitchLight(' + item.idx + ',\'On\',' + item.Protected + ');" class="lcursor"') + ' height="48" width="48"></td>\n';
								}
							}
							else if (item.SwitchType == "Dusk Sensor") {
								bAddTimer = false;
								if (item.Status == 'On') {
									xhtm += '\t      <td id="img"><img src="images/uvdark.png" title="' + $.t("Nighttime") + '" height="48" width="48"></td>\n';
								}
								else {
									xhtm += '\t      <td id="img"><img src="images/uvsunny.png" title="' + $.t("Daytime") + '" height="48" width="48"></td>\n';
								}
							}
							else if (item.SwitchType == "Motion Sensor") {
								if (
									(item.Status == 'On') ||
									(item.Status == 'Chime') ||
									(item.Status == 'Group On') ||
									(item.Status.indexOf('Set ') == 0)
								) {
									xhtm += '\t      <td id="img"><img src="images/motion48-on.png" height="48" width="48"></td>\n';
								}
								else {
									xhtm += '\t      <td id="img"><img src="images/motion48-off.png" height="48" width="48"></td>\n';
								}
								bAddTimer = false;
							}
							else if (item.SwitchType === "Selector") {
								if (item.Status === 'Off') {
									xhtm += '\t      <td id="img"><img src="images/' + item.Image + '48_Off.png" height="48" width="48"></td>\n';
								} else if (item.LevelOffHidden) {
									xhtm += '\t      <td id="img"><img src="images/' + item.Image + '48_On.png" height="48" width="48"></td>\n';
								} else {
									xhtm += '\t      <td id="img"><img src="images/' + item.Image + '48_On.png" title="' + $.t("Turn Off") + '" onclick="SwitchLight(' + item.idx + ',\'Off\',' + item.Protected + ');" class="lcursor" height="48" width="48"></td>\n';
								}
							}
							else if (item.SubType.indexOf("Itho") == 0) {
								bAddTimer = false;
								xhtm += '\t      <td id="img"><img src="images/Fan48_On.png" height="48" width="48" class="lcursor" onclick="ShowIthoPopup(event, ' + item.idx + ', ShowLights, ' + item.Protected + ');"></td>\n';
							}
							else if (item.SubType.indexOf("Lucci Air DC") == 0) {
								bAddTimer = false;
								xhtm += '\t      <td id="img"><img src="images/Fan48_On.png" height="48" width="48" class="lcursor" onclick="ShowLucciDCPopup(event, ' + item.idx + ', ShowLights, ' + item.Protected + ');"></td>\n';
							}
							else if (
								(item.SubType.indexOf("Lucci") == 0) ||
								(item.SubType.indexOf("Westinghouse") == 0)
								) {
							    bAddTimer = false;
							    xhtm += '\t      <td id="img"><img src="images/Fan48_On.png" height="48" width="48" class="lcursor" onclick="ShowLucciPopup(event, ' + item.idx + ', ShowLights, ' + item.Protected + ');"></td>\n';
							}
							else {
								if (
									(item.Status == 'On') ||
									(item.Status == 'Chime') ||
									(item.Status == 'Group On') ||
									(item.Status.indexOf('Down') != -1) ||
									(item.Status.indexOf('Up') != -1) ||
									(item.Status.indexOf('Set ') == 0)
								) {
									if (item.Type == "Thermostat 3") {
										xhtm += '\t      <td id="img"><img src="images/' + item.Image + '48_On.png" onclick="ShowTherm3Popup(event, ' + item.idx + ',' + item.Protected + ');" class="lcursor" height="48" width="48"></td>\n';
									}
									else {
										xhtm += '\t      <td id="img"><img src="images/' + item.Image + '48_On.png" title="' + $.t("Turn Off") + '" onclick="SwitchLight(' + item.idx + ',\'Off\',' + item.Protected + ');" class="lcursor" height="48" width="48"></td>\n';
									}
								}
								else {
									if (item.Type == "Thermostat 3") {
										xhtm += '\t      <td id="img"><img src="images/' + item.Image + '48_Off.png" onclick="ShowTherm3Popup(event, ' + item.idx + ',' + item.Protected + ');" class="lcursor" height="48" width="48"></td>\n';
									}
									else {
										xhtm += '\t      <td id="img"><img src="images/' + item.Image + '48_Off.png" title="' + $.t("Turn On") + '" onclick="SwitchLight(' + item.idx + ',\'On\',' + item.Protected + ');" class="lcursor" height="48" width="48"></td>\n';
									}
								}
							}
							xhtm +=
								'\t      <td id="status">' + status + '</td>\n' +
								'\t      <td id="lastupdate">' + item.LastUpdate + '</td>\n' +
								'\t      <td id="type">' + item.Type + ', ' + item.SubType + ', ' + item.SwitchType;
							if (item.SwitchType == "Dimmer") {
								if (item.DimmerType && item.DimmerType!="abs") {
									// Don't show dimmer slider if the device does not support absolute dimming
								}
								else {
									xhtm += '<br><br><div style="margin-left:60px;" class="dimslider" id="slider" data-idx="' + item.idx + '" data-type="norm" data-maxlevel="' + item.MaxDimLevel + '" data-isprotected="' + item.Protected + '" data-svalue="' + item.LevelInt + '" data-isled="' + isLED(item.SubType) + '"></div>';
								}
							}
							else if (item.SwitchType == "TPI") {
								xhtm += '<br><br><div style="margin-left:60px;" class="dimslider" id="slider" data-idx="' + item.idx + '" data-type="relay" data-maxlevel="' + item.MaxDimLevel + '" data-isprotected="' + item.Protected + '" data-svalue="' + item.LevelInt + '"';
								if (item.Unit < 64 || item.Unit > 95)
									xhtm += ' data-disabled="true"';
								xhtm += '></div>';
							}
							else if (item.SwitchType == "Blinds Percentage") {
								xhtm += '<br><div style="margin-left:108px; margin-top:7px;" class="dimslider dimsmall" id="slider" data-idx="' + item.idx + '" data-type="blinds" data-maxlevel="' + item.MaxDimLevel + '" data-isprotected="' + item.Protected + '" data-svalue="' + item.LevelInt + '"></div>';
							}
							else if (item.SwitchType == "Blinds Percentage Inverted") {
								xhtm += '<br><div style="margin-left:108px; margin-top:7px;" class="dimslider dimsmall" id="slider" data-idx="' + item.idx + '" data-type="blinds_inv" data-maxlevel="' + item.MaxDimLevel + '" data-isprotected="' + item.Protected + '" data-svalue="' + item.LevelInt + '"></div>';
							}
							else if (item.SwitchType == "Selector") {
								if (item.SelectorStyle === 0) {
									xhtm += '<br/><div class="btn-group" style="display: block; margin-top: 4px;" id="selector' + item.idx + '" data-idx="' + item.idx + '" data-isprotected="' + item.Protected + '" data-level="' + item.LevelInt + '" data-levelnames="' + item.LevelNames + '" data-selectorstyle="' + item.SelectorStyle + '" data-levelname="' + escape(GetLightStatusText(item)) + '" data-leveloffhidden="' + item.LevelOffHidden + '" data-levelactions="' + item.LevelActions + '">';
									var levelNames = b64DecodeUnicode(item.LevelNames).split('|');
									$.each(levelNames, function (index, levelName) {
										if ((index === 0) && (item.LevelOffHidden)) {
											return;
										}
										xhtm += '<button type="button" class="btn btn-small ';
										if ((index * 10) == item.LevelInt) {
											xhtm += 'btn-selected"';
										}
										else {
											xhtm += 'btn-default"';
										}
										xhtm += 'id="lSelector' + item.idx + 'Level' + index + '" name="selector' + item.idx + 'Level" value="' + (index * 10) + '" onclick="SwitchSelectorLevel(' + item.idx + ',\'' + unescape(levelName) + '\',' + (index * 10) + ',' + item.Protected + ');">' + levelName + '</button>';
									});
									xhtm += '</div>';
								} else if (item.SelectorStyle === 1) {
									xhtm += '<br><div class="selectorlevels" style="margin-top: 0.4em;">';
									xhtm += '<select id="selector' + item.idx + '" data-idx="' + item.idx + '" data-isprotected="' + item.Protected + '" data-level="' + item.LevelInt + '" data-levelnames="' + item.LevelNames + '" data-selectorstyle="' + item.SelectorStyle + '" data-levelname="' + escape(GetLightStatusText(item)) + '" data-leveloffhidden="' + item.LevelOffHidden + '" data-levelactions="' + item.LevelActions + '">';
									var levelNames = b64DecodeUnicode(item.LevelNames).split('|');
									$.each(levelNames, function (index, levelName) {
										if ((index === 0) && (item.LevelOffHidden)) {
											return;
										}
										xhtm += '<option value="' + (index * 10) + '">' + levelName + '</option>';
									});
									xhtm += '</select>';
									xhtm += '</div>';
								}
							}
							xhtm += '</td>\n' +
								'\t      <td class="options">';
							xhtm +=
								'</td>\n' +
								'\t    </tr>\n' +
								'\t    </table>\n' +
								'\t  </section>\n' +
								'\t</div>\n';
							htmlcontent += xhtm;
							j += 1;
						});
					}
				}
			});
			if (bHaveAddedDevider == true) {
				//close previous devider
				htmlcontent += '</div>\n';
			}
			if (j == 0) {
				htmlcontent = '<h2>' + $.t('No Lights/Switches found or added in the system...') + '</h2>';
			}
			$('#modal').hide();
			$element.html(tophtm + htmlcontent);
			$element.i18n();
			if (bShowRoomplan == true) {
				$.each($.RoomPlans, function (i, item) {
					var option = $('<option />');
					option.attr('value', item.idx).text(item.name);
					$element.find("#comboroom").append(option);
				});
				if (typeof roomPlanId != 'undefined') {
					$element.find("#comboroom").val(roomPlanId);
				}
				$element.find("#comboroom").change(function () {
					var idx = $element.find("#comboroom option:selected").val();
					window.myglobals.LastPlanSelected = idx;

					$route.updateParams({
						room: idx > 0 ? idx : undefined
					});
					$location.replace();
					$scope.$apply();
				});
			}

			$rootScope.RefreshTimeAndSun();

			//Create Dimmer Sliders
			$element.find('.dimslider').slider({
				//Config
				range: "min",
				min: 0,
				max: 15,
				value: 4,

				//Slider Events
				create: function (event, ui) {
					$(this).slider("option", "max", $(this).data('maxlevel'));
					$(this).slider("option", "type", $(this).data('type'));
					$(this).slider("option", "isprotected", $(this).data('isprotected'));
					$(this).slider("value", $(this).data('svalue'));
					if ($(this).data('disabled'))
						$(this).slider("option", "disabled", true);
				},
				slide: function (event, ui) { //When the slider is sliding
					clearInterval($.setDimValue);
					var maxValue = $(this).slider("option", "max");
					var dtype = $(this).slider("option", "type");
					var isled = $(this).data('isled');
					var isProtected = $(this).slider("option", "isprotected");
					var fPercentage = parseInt((100.0 / maxValue) * ui.value);
					var idx = $(this).data('idx');
					id = "#lightcontent #" + idx;
					var obj = $(id);
					if (typeof obj != 'undefined') {
						var img = "";
						var imgname = $('#' + idx + ' .lcursor').prop('src');
						imgname = imgname.substring(imgname.lastIndexOf("/") + 1, imgname.lastIndexOf("_O") + 2);
						if (dtype == "relay")
							imgname = "Fireplace48_O"
						var bigtext;
						if (fPercentage == 0) {
							img = '<img src="images/' + imgname + 'ff.png" title="' + $.t("Turn On") + '" onclick="SwitchLight(' + idx + ',\'On\',' + isProtected + ');" class="lcursor" height="48" width="48">';
							if (dtype == "blinds") {
								bigtext = "Open";
							}
							else if (dtype == "blinds_inv") {
								bigtext = "Closed";
							}
							else {
								bigtext = "Off";
							}
						}
						else {
							img = '<img src="images/' + imgname + 'n.png" title="' + $.t("Turn Off") + '" onclick="SwitchLight(' + idx + ',\'Off\',' + isProtected + ');" class="lcursor" height="48" width="48">';
							bigtext = fPercentage + " %";
						}
						if ((dtype != "blinds") && (dtype != "blinds_inv") && !isled) {
							if ($(id + " #img").html() != img) {
								$(id + " #img").html(img);
							}
						}
						if ($(id + " #bigtext").html() != bigtext) {
							$(id + " #bigtext").html(bigtext);
						}
					}
					if (dtype != "relay")
						$.setDimValue = setInterval(function () { SetDimValue(idx, ui.value); }, 500);
				},
				stop: function (event, ui) {
					var idx = $(this).data('idx');
					var dtype = $(this).slider("option", "type");
					if (dtype == "relay")
						SetDimValue(idx, ui.value);
				}
			});
			$scope.ResizeDimSliders();

			//Create Selector selectmenu
			$element.find('.selectorlevels select').selectmenu({
				//Config
				width: '75%',
				value: 0,
				//Selector selectmenu events
				create: function (event, ui) {
					var select$ = $(this),
						idx = select$.data('idx'),
						isprotected = select$.data('isprotected'),
						disabled = select$.data('disabled'),
						level = select$.data('level'),
						levelname = select$.data('levelname');
					select$.selectmenu("option", "idx", idx);
					select$.selectmenu("option", "isprotected", isprotected);
					select$.selectmenu("option", "disabled", disabled === true);
					select$.selectmenu("menuWidget").addClass('selectorlevels-menu');
					select$.val(level);

					$element.find('#' + idx + " #bigtext").html(unescape(levelname));
				},
				change: function (event, ui) { //When the user selects an option
					var select$ = $(this),
						idx = select$.selectmenu("option", "idx"),
						level = select$.selectmenu().val(),
						levelname = select$.find('option[value="' + level + '"]').text(),
						isprotected = select$.selectmenu("option", "isprotected");
					// Send command
					SwitchSelectorLevel(idx, unescape(levelname), level, isprotected);
					// Synchronize buttons and select attributes
					select$.data('level', level);
					select$.data('levelname', levelname);
				}
			}).selectmenu('refresh');

			RefreshLights();
			return false;
		}

		$scope.ResizeDimSliders = function () {
			var nobj = $element.find("#name");
			if (typeof nobj == 'undefined') {
				return;
			}
			var width = nobj.width() - 50;
			$element.find(".dimslider").width(width);
			$element.find(".dimsmall").width(width - 48);
		}

		$.strPad = function (i, l, s) {
			var o = i.toString();
			if (!s) { s = '0'; }
			while (o.length < l) {
				o = s + o;
			}
			return o;
		};


		EnableDisableSubDevices = function (ElementID, bEnabled) {
			var trow = $(ElementID);
			if (bEnabled == true) {
				trow.show();
			}
			else {
				trow.hide();
			}
		}

		init();

		function init() {
			//global var
			$.devIdx = 0;
			$.LastUpdateTime = parseInt(0);

			$.myglobals = {
				TimerTypesStr: [],
				CommandStr: [],
				OccurenceStr: [],
				MonthStr: [],
				WeekdayStr: [],
				SelectedTimerIdx: 0
			};
			$.LightsAndSwitches = [];
			// $scope.MakeGlobalConfig();

			$('#timerparamstable #combotype > option').each(function () {
				$.myglobals.TimerTypesStr.push($(this).text());
			});
			$('#timerparamstable #combocommand > option').each(function () {
				$.myglobals.CommandStr.push($(this).text());
			});
			$('#timerparamstable #occurence > option').each(function () {
				$.myglobals.OccurenceStr.push($(this).text());
			});
			$('#timerparamstable #months > option').each(function () {
				$.myglobals.MonthStr.push($(this).text());
			});
			$('#timerparamstable #weekdays > option').each(function () {
				$.myglobals.WeekdayStr.push($(this).text());
			});

			$scope.$on('device_update', function (event, deviceData) {
				RefreshItem(deviceData);
			});

			$(window).resize(function () { $scope.ResizeDimSliders(); });

			ShowLights();
		};

		$scope.$on('$destroy', function () {
			$(window).off("resize");
			var popup = $("#rgbw_popup");
			if (typeof popup != 'undefined') {
				popup.hide();
			}
			popup = $("#thermostat3_popup");
			if (typeof popup != 'undefined') {
				popup.hide();
			}
		});
//
            }