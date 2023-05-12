# Domoticz Python Plugin with Command line interface for python-broadlink

Hi, 
complete new plugin.
Old version (4.x) could not be upgraded, you need to create a new folder, and import your ini files if you want to use this one.


[u]Info [/u]: do not use the official app if using broadlink library
see [url]https://github.com/mjg59/python-broadlink/issues/377[/url]

note: [b]pip[/b] need to be installed
(for linux users: sudo apt install python3-pip)


To be able to see the Web Pages, Custom menu need to be activated: Domoticz / settings.

Be sure that your [b]active[/b] python version is > 3.4 (Change python version system-wide)
this mean: python --version ( or sudo python --version for linux users)
should give output e.g. python 3.x.x and not python 2.x.x
see this link [url]https://www.domoticz.com/wiki/Using_Python_plugins[/url]
or this one : [url]https://linuxconfig.org/how-to-change-from-default-to-alternative-python-version-on-debian-linux[/url]


[u]Features[/u]:

Multi-Language
Multi-Devices (MP1 / A1 / SP1-2-3 / RM2-3 Pro & mini / RM4 Pro & mini
Web Admin page
RF is now managed
Multi-code ini file creation by drag & drop
Create Broadlink ini from Pronto Hex
Create ini from e-Control
Modify number of repetition (do and test with caution)
Import feature
Send code with a simple URL
and more .....


[u]Installation [/u]:

create Broadlink directory under your Domoticz/plugins folder.
download setup.py from here : [url]https://raw.githubusercontent.com/zak-45/Broadlink-Domoticz-plugin/main/setup.py[/url]
and put it into Broadlink directory.

Open a terminal session, go to Broadlink directory and execute this command : python setup.py (tested on Windows with admin right, maybe need sudo on linux e.g; : sudo python setup.py)

Provide response to questions.
Restart Domoticz.
Create a new hardware, type : Broadlink with Kodi Remote

[u]Manual installation[/u]:
download all files from provided link to the Broadlink directory.
install these required modules:

['setuptools', 'wheel', 'googletrans', 'translate', 'requests', 'requests_toolbelt', 'irgen']

for Broadlink module, install the provided version not the one from pip:
   for win : python -m pip install python-broadlink-master/.
   for other : sudo -H python -m pip install python-broadlink-master/.
and do not forget to put executable file under Broadlink/scr ( chmod +x )

WebAdmin Page overview:

[attachment=2]A1admin.PNG[/attachment]
[attachment=1]rm2admin.PNG[/attachment]
[attachment=0]sp3sadmin.PNG[/attachment]


[u]For Devlopers[/u]:
this is the port necessary to use MS visual debugger

--> main py : plugin.py
            Domoticz.Log('Waiting for MS Visual Studio remote debugger connection ....')
            ptvsd.enable_attach(address=('0.0.0.0', [b]5678[/b]))

--> subprocess : Dombroadlink.py
            ptvsd.enable_attach(address=('0.0.0.0', [b]6789[/b]))

module [b]ptvsd[/b] need to be installed.


Lets try and play with it.
Provide bugs/feedback here.

Enjoy !!

test platform : Windows 10 
Version: 2020.2 (build 12120)
Build Hash: ecd90cd57
Compile Date: 2020-06-04 20:50:42
dzVents Version: 3.0.9
Python Version: 3.7.5 (tags/v3.7.5:5c02a39a0b, Oct 14 2019, 23:09:19) [MSC v.1916 32 bit (Intel)]




# Python control for Broadlink RM2, RM3 and RM4 series controllers

A simple Python API for controlling IR/RF controllers from [Broadlink](http://www.ibroadlink.com/rm/). At present, the following devices are currently supported:

* RM Pro (referred to as RM2 in the codebase)
* A1 sensor platform devices are supported
* RM3 mini IR blaster
* RM4 and RM4C mini blasters

There is currently no support for the cloud API.

## Example use

Setup a new device on your local wireless network:

1. Put the device into AP Mode
2. Long press the reset button until the blue LED is blinking quickly.
3. Long press again until blue LED is blinking slowly.
4. Manually connect to the WiFi SSID named BroadlinkProv.
5. Run setup() and provide your ssid, network password (if secured), and set the security mode
6. Security mode options are (0 = none, 1 = WEP, 2 = WPA1, 3 = WPA2, 4 = WPA1/2)

```
import broadlink

broadlink.setup('myssid', 'mynetworkpass', 3)
```

Discover available devices on the local network:

```
import broadlink

devices = broadlink.discover(timeout=5)
```

Obtain the authentication key required for further communication:

```
devices[0].auth()
```

Enter learning mode:

```
devices[0].enter_learning()
```

Sweep RF frequencies:

```
devices[0].sweep_frequency()
```

Cancel sweep RF frequencies:

```
devices[0].cancel_sweep_frequency()
```

Check whether a frequency has been found:

```
found = devices[0].check_frequency()
```

(This will return True if the RM has locked onto a frequency, False otherwise)

Attempt to learn an RF packet:

```
found = devices[0].find_rf_packet()
```

(This will return True if a packet has been found, False otherwise)

Obtain an IR or RF packet while in learning mode:

```
ir_packet = devices[0].check_data()
```

(This will return None if the device does not have a packet to return)

Send an IR or RF packet:

```
devices[0].send_data(ir_packet)
```

Obtain temperature data from an RM2:

```
devices[0].check_temperature()
```

Obtain sensor data from an A1:

```
data = devices[0].check_sensors()
```

Set power state on a SmartPlug SP2/SP3:

```
devices[0].set_power(True)
```

Check power state on a SmartPlug:

```
state = devices[0].check_power()
```

Check energy consumption on a SmartPlug:

```
state = devices[0].get_energy()
```

Set power state for S1 on a SmartPowerStrip MP1:

```
devices[0].set_power(1, True)
```

Check power state on a SmartPowerStrip:

```
state = devices[0].check_power()
```

# Command line interface for python-broadlink

This is a command line interface for broadlink python library

Tested with BroadLink RMPRO / RM2

## Requirements

You should have the broadlink python installed, this can be made in many linux distributions using :

```
sudo pip install broadlink
```

## Installation

Just copy this files

## Programs

* broadlink\_discovery used to run the discovery in the network this program withh show the command line parameters to be used with broadlink\_cli to select broadlink device
* broadlink\_cli used to send commands and query the broadlink device

## device specification formats

Using separate parameters for each information:

```
broadlink_cli --type 0x2712 --host 1.1.1.1 --mac aaaaaaaaaa --temp
```

Using all parameters as a single argument:

```
broadlink_cli --device "0x2712 1.1.1.1 aaaaaaaaaa" --temp
```

Using file with parameters:

```
broadlink_cli --device @BEDROOM.device --temp
```

This is prefered as the configuration is stored in file and you can change just a file to point to a different hardware

## Sample usage

Learn commands :

```
# Learn and save to file
broadlink_cli --device @BEDROOM.device --learnfile LG-TV.power
# LEard and show at console
broadlink_cli --device @BEDROOM.device --learn 
```

Send command :

```
broadlink_cli --device @BEDROOM.device --send @LG-TV.power
broadlink_cli --device @BEDROOM.device --send ....datafromlearncommand...
```

Get Temperature :

```
broadlink_cli --device @BEDROOM.device --temperature
```

Get Energy Consumption (For a SmartPlug) :

```
broadlink_cli --device @BEDROOM.device --energy
```

Once joined to the Broadlink provisioning Wi-Fi, configure it with your Wi-Fi details:

```
broadlink_cli --joinwifi MySSID MyWifiPassword
```
