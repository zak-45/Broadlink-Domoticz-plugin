# -*- coding: utf-8 -*-
#
#   Main program to manage broadlink devices
#   Part of Domoticz plugin: Broadlink
#
#           Dev. Platform : Win10 x64 & Py 3.7.5 x86
#
#           Author:     zak45, 2020
#           1.0.0:  initial release
#           1.1.0: 13/07/2020
#                   modify broadlink_connect()
#
#           1.3.0 : 04/08/2020
#                   module Broadlink v 0.14.1
#                   some code improvement
#
#           1.4.2 : 10/08/2020
#                   no overwrite lang file during update
#
#           1.6.3 : 08/01/2021
#                   Work now in docker env: changed to 127.0.0.1 instead domoticz ip
#
#

import base64
import codecs
import configparser
import json
#
import os
import shutil
import subprocess
import re
import socket
import sys
import time
import traceback
import cgitb
import urllib.parse
import urllib.request
from datetime import datetime

import requests

import broadlink
from broadlink.exceptions import ReadError, StorageError

#
# Translation
#
notra = False
#
try:
    from googletrans import Translator

except (ValueError, Exception):
    # module translate not there
    notra = True
    print(traceback.format_exc())
#
# command line arguments
# 127.0.0.1,8080,9005,192.168.0.1,8181,BOTH,28,C:\Program Files(x86)\Domoticz\plugins\Broadlink\,[],999,9,en,init
args = sys.argv[1].split(';')
#
# lang to translate
langto = args[11]
#
traduction = False
#
# Fallback module for translation
try:
    from translate import Translator as Translatorf

except (ValueError, Exception):
    # module translate not there
    print(traceback.format_exc())
#
fromlang = 'en'
emailaddr = 'myemail@test.com'
#
domip = args[0]
domport = args[1]
mac = args[2]
inifolder = args[3]
devtype = args[4]
broip = args[5]
lisport = args[6]
INFOLEVEL = args[7]
#
folder = args[9]
step = args[12]
#
# Domoticz HWID
hwid = str(args[8])
#
interactive = sys.argv[2]
#
langdict = {}
#
devices = {}
#
data = {}
#
DEVICE = broadlink.rm(host=('', 80), mac=bytearray.fromhex(''), devtype=0x272a)
ISCONNECTED = False
LEARNEDCOMMAND = ''
TIMEOUT = 30
url = 'https://synnas.publicvm.com:4430/s/Czn9r8G8QwrZ7ji/download'
getpluginurl = 'https://synnas.publicvm.com:4430/s/pNbw6pD7w33TTQX/download'


#
# check if port is open
#
def is_open(ip, port):
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.settimeout(1.0)

    try:
        s.connect((ip, int(port)))
        s.shutdown(2)

        return True

    except (ValueError, Exception):

        return False


#
# find translation
# if no translation, put __ on head/end
# if traduction is true we translate text
#
def _(datalng):
    origdata = datalng

    if traduction:
        tr_text(datalng)

    if datalng in langdict:
        datalng = langdict[datalng]
    else:
        if type(datalng) is str:
            datalng = "_" + origdata + "_"
        else:
            datalng = origdata

    return datalng


#
# Base 64
#
def string_to_base64(s):
    return base64.b64encode(s.encode('utf-8'))


def base64_to_string(b):
    return base64.b64decode(b).decode('utf-8')


#
# we load lang dict: en;xx
#
def load_lang():
    global langdict

    lang_file = folder + 'lng/en_' + langto + '.lng'

    try:
        with open(lang_file, 'r', encoding='utf-8') as fp:
            for line in fp:
                key, val = line.split('|;|')
                key = key.rstrip('\r\n')
                val = val.rstrip('\r\n')
                langdict[key] = val.rstrip('\r\n')

    except (ValueError, Exception):
        print(traceback.format_exc())
        print(_('Error to load language file'))
        gen_error('load_lang', _('Error to load language file'))

    return


#
# we translate the text, original lang : 'en'
# and append into the lang file (en_<<langto>>.lng)
#
def tr_text(idata):
    if notra:
        translation = idata
        return translation

    if idata is None or idata == "":
        idata = ""
        translation = idata
        return translation

    translation = idata

    lang_file = folder + 'lng/en_' + langto + '.lng'

    if idata not in langdict:
        try:
            if langto != 'en':
                try:
                    translator = Translator()
                    translation = translator.translate(idata, dest=langto, src='en').text
                    # print('traduction: {} '.format(translation))
                except (ValueError, Exception):
                    translator = Translatorf(to_lang=langto, from_lang='en', email=emailaddr)
                    translation = translator.translate(idata)
                    # print('traduction: {} '.format(translation))
                print(_('we translate the text : {}').format(idata))

            if translation != "" or translation != " ":
                translation = translation.rstrip('\r\n')
                translation = translation.replace(" ()", "()")
                translation = translation.replace("'", " ")
                langdict[idata] = translation
                with open(lang_file, 'a+', encoding='utf-8') as fp:
                    fp.write(idata + '|;|' + translation + '\n')

        except (ValueError, Exception):
            print(traceback.format_exc())
            gen_error('tr_text', _('error in translation, we keep original text'))
            translation = str(idata)
            print(translation)

    else:
        # print('we use text from langdict')
        translation = langdict[idata]

    return translation


# execute json request to Domoticz
def exe_domoticz(params):
    global data

    data = {}
    try:
        params = urllib.parse.urlencode(params, doseq=True)
        html_url = urllib.request.urlopen('http://' + '127.0.0.1' + ':' + domport + '/json.htm?' + params, timeout=10)
        response = html_url.read()
        encoding = html_url.info().get_content_charset('utf-8')
        data = json.loads(response.decode(encoding))
        print(_('Request Domoticz to : {} used encoding is : {}').format(str(params), str(encoding)))

    except (ValueError, Exception):
        print(traceback.format_exc())
        gen_error('exeDomoticz', _('Error sending command to Domoticz : {}').format(str(params)))
        return False

    return True


# print Error
def gen_error(proc, imsg):
    print(imsg)
    sendstatus("ERR : " + proc, imsg, '21')
    print('Error :', str(sys.exc_info()[0]), str(sys.exc_info()[1]), str(sys.exc_info()[2]))

    return


# send data to plugin.py listener
def send_data(idata):
    urlo = 'http://' + '127.0.0.1' + ':' + str(lisport) + '/'

    try:
        requests.post(urlo, data=idata.encode('utf-8'), headers={'Content-type': 'text/plain; charset=utf-8'},
                      timeout=10)

    except (ValueError, Exception):
        print(traceback.format_exc())
        print('send_data', _('Error sending data'))

    return


#
# send status to plugin.py
#
def sendstatus(istep, istatus, icode):
    idata = '{"status":{"step":"' + str(istep) + '","msg":"' + str(istatus) + '","code":"' + str(icode) + '"}}'
    send_data(str(idata))

    return


#
# send end task to plugin.py
#
def sendend(istep, istatus):
    idata = '{"end":{"step":"' + str(istep) + '","msg":"' + str(istatus) + '"}}'
    send_data(str(idata))

    return


#
# Create devices dict from Domoticz by name
# if name not unique this can made trouble
# /json.htm?type=devices&filter=all&used=true&order=Name
#
def dev_domoticz():
    global devices

    params = {'type': 'devices', 'filter': 'all', 'used': 'true', 'order': 'Name'}
    if exe_domoticz(params):
        if data['status'] == 'OK':
            result = data['result']
            for item in result:
                iname = item['Name']
                devices[iname] = item

        else:

            gen_error('dev_domoticz', _('Domoticz do not send OK message for: {} ??').format('devices'))

    else:

        gen_error('dev_domoticz', _('Error retrieve dict data from Domoticz : {}').format('devices'))

    return True


#
# find sentence to translate
# _("...") keyword.
# translate to langto
#
def extract_sentence(iname):
    brofile = folder + iname

    with open(brofile, encoding='utf-8') as myfile:
        for idatabro in myfile:
            # we find all words between _(" ...  ")
            findkey = re.findall("(_\('[^\)]*'\)|_\(\"[^\)]*\"\))", idatabro)
            # we translate
            '''
            if findkey:
                findkeyword = findkey.group()
                result=findkeyword[3:-2]
                trText(result)
            '''
            for txt in findkey:
                tr_text(txt[3:-2])

    return


#
# discover Broadlink device on the Network
#
def discover():
    bro = '255.255.255.255'
    txtdevice = ''

    print("Discovering...")
    bdevices = broadlink.discover(timeout=15, local_ip_address=domip, discover_ip_address=bro)
    print("Found " + str(len(bdevices)) + "broadlink devices " + "---" + (datetime.now().strftime('%Y-%m-%d %H:%M:%S')))
    txtdevice += "Found " + str(len(bdevices)) + " devices --" + datetime.now().strftime('%Y-%m-%d %H:%M:%S') + "\n"
    print("")
    if str(len(bdevices)) == 0:
        return txtdevice
    for idevice in bdevices:
        if idevice.auth():
            print("###########################################")
            txtdevice += "###########################################" + "\n"
            print(idevice.type)
            txtdevice += "Device : " + str(idevice.type) + "\n"
            print("# broadlink_cli --type {} --host {} --mac {}".format(hex(idevice.devtype), idevice.host[0],
                                                                        ''.join(format(x, '02x') for x in idevice.mac)))
            print("Device file data (to be used with --device @filename in broadlink_cli) : ")
            print("{} {} {}".format(hex(idevice.devtype), idevice.host[0],
                                    ''.join(format(x, '02x') for x in idevice.mac)))
            txtdevice += \
                ("Devtype : {} Host : {} Mac : {}".format(hex(idevice.devtype),
                                                          idevice.host[0],
                                                          ''.join(format(x, '02x') for x in idevice.mac))) + "\n"
            try:
                if hasattr(idevice, 'check_temperature'):
                    print("temperature = {}".format(idevice.check_temperature()))
                    txtdevice += (" temperature = {}".format(idevice.check_temperature()))
                if hasattr(idevice, 'get_energy'):
                    print("energy = {}".format(idevice.get_energy()))
                    txtdevice += (" energy = {}".format(idevice.get_energy()))
                if hasattr(idevice, 'check_nightlight'):
                    print("night light = {}".format(idevice.check_nightlight()))
                    txtdevice += (" night light = {}".format(idevice.check_nightlight()))

            except (AttributeError, StorageError):
                pass

            print("")
            txtdevice += "\n"

        else:
            
            print("Error authenticating with device : {}".format(idevice.host))
            txtdevice += ("Error authenticating with device : {}".format(idevice.host))

    return txtdevice


#
# Put Broadlink on Learn , packet received converted to Hex
# loop until check_data is true
#
def learnir():
    global LEARNEDCOMMAND

    LEARNEDCOMMAND = "None"

    if not ISCONNECTED:
        broadlink_connect()

    #
    # we put device into learning mode until
    # command is learned or timeout
    #
    try:
        DEVICE.enter_learning()

    except (ValueError, Exception):
        print(traceback.format_exc())
        gen_error('learnir', _('Not able to enter learning mode'))

        return False

    print(_("Learning..."))
    start = time.time()
    while time.time() - start < TIMEOUT:
        time.sleep(1)
        try:
            idata = DEVICE.check_data()
        except (ReadError, StorageError):
            continue
        else:
            break

    else:

        gen_error('learnir', _("No data received..."))

        return False

    LEARNEDCOMMAND = (codecs.encode(idata, 'hex_codec')).decode('utf-8')

    idata = '{"learned_command":{"data":"' + LEARNEDCOMMAND + '"}}'
    send_data(str(idata))
    print(_("Code learned"))

    return True


#
# sweep_frequency() # LED will be red --> scan to found RF
# check_frequency()  # call until true (see #1), 1 sec intervals, requires 5-10 RF button clicks
#                   # frequency is now found, and LED turns off, need to call cancel_sweep_frequency() after
# find_rf_packet()   # call only once, LED will turn on (just like with IR enter_learning())
# check_data()       # call until result is not empty, usually requires only 1-2 RF button clicks
#                   # LED will turn off, and data can be used for send_data()
# on reset we need to call cancel_sweep_frequency()
#
def sweep():
    try:
        broadlink_connect()
        DEVICE.sweep_frequency()
        print(_("sweeping...; LED should be RED"))

        i = 0
        while i < 20:
            if DEVICE.check_frequency():
                break
            i = i + 1
            time.sleep(1)
            print(_("check frequency... {}").format(str(i)))

        if DEVICE.check_frequency():
            print(_("frequency found! check LED, should be off"))

        else:

            DEVICE.cancel_sweep_frequency()
            gen_error('sweep', _("frequency not found... "))

            return False
    except (ValueError, Exception):
        gen_error('sweep', traceback.format_exc())

        return False

    DEVICE.cancel_sweep_frequency()

    return True


def learnrf():
    global LEARNEDCOMMAND

    LEARNEDCOMMAND = "None"
    print(_("learning command"))
    idata = ''

    if not ISCONNECTED:
        broadlink_connect()

    if DEVICE.find_rf_packet():

        i = 0
        while i < 10:
            try:
                idata = DEVICE.check_data()
                break
            except (ValueError, Exception):
                pass
            i = i + 1
            time.sleep(1)
            print(_("verify command...{} ").format(str(i)))

        if i >= 10 and not idata:
            gen_error('learnrf', _("not able to learn command"))
            DEVICE.cancel_sweep_frequency()

            return False

        else:

            LEARNEDCOMMAND = (codecs.encode(idata, 'hex_codec')).decode('utf-8')
            idata = '{"learned_command":{"data":"' + LEARNEDCOMMAND + '"}}'
            send_data(str(idata))
            print(_("Code learned"))
            print(_("Code stored in memory"))

    else:

        gen_error('learnrf', _("RF not true, sweep necessary"))

        return False

    return True


#
# Download plugin file from Cloud Drive
#
def remote_plugin():
    iupdname = folder + "tst-plugin"
    leng = 0
    try:
        idata = requests.get(getpluginurl, timeout=10, stream=True, verify=False)
        # Open the output file and make sure we write in binary mode
        print(_('We download plugin file to: {}').format(iupdname))
        with open(iupdname, 'wb') as ifh:
            # Walk through the request response in chunks of 1024 * 1024 bytes, so 1MiB
            for ichunk in idata.iter_content(1024 * 1024):
                # Write the chunk to the file
                ifh.write(ichunk)
                leng = leng + len(ichunk)
                print("\r>> Bytes downloaded -->" + step + str(leng) + step, end='', flush=True)
                # Optionally we can check here if the download is taking too long

        print(': 100% Done')

    except (ValueError, Exception):
        print(traceback.format_exc())
        gen_error('remote_plugin', _('Error receive / save file from Cloud Drive : {}').format(str(getpluginurl)))

        return False

    return True


#
# retrieve plugin version
#
def remote_plugin_ver(fn):
    try:
        with open(fn, 'r', encoding='utf-8') as v:
            idata = v.read()
            findkey = re.search('version="(.)*?"', idata)
            iver = findkey.group()

    except (ValueError, Exception):
        print(traceback.format_exc())
        gen_error('remote_plugin_ver', _('Error to retrieve plugin version from : {}').format(fn))
        iver = "**ERROR**"

    return iver


#
# connect to Broadlink
#
def broadlink_connect():
    global DEVICE, ISCONNECTED

    try:
        DEVICE = broadlink.gendevice(host=(broip, 80), mac=bytearray.fromhex(mac), dev_type=read_type())
        DEVICE.auth()
        # device.host
        ISCONNECTED = True
        print(_("Connected to Broadlink device: {} {} {}").format(str(broip), hex(read_type()), DEVICE.type))

    except (ValueError, Exception):
        print(traceback.format_exc())
        gen_error('broadlink_connect', _("Error Connecting to Broadlink device....").format(str(broip)))
        ISCONNECTED = False

        return False

    return True


#
# Retrieve type from file
#
def read_type():

    devfile = folder + "log/" + hwid + devtype + ".txt"

    try:
        with open(devfile, 'r', encoding='utf-8') as fp:
            value = fp.read().split(' ')
            brotype = int(value[0], base=16)

    except (ValueError, Exception):
        Domoticz.Error(traceback.format_exc())
        Domoticz.Error(_("Error to retrieve type from this file : {}").format(devfile))
        brotype = 0

    return brotype


#
# Plugin backup
#
def backup():
    foldertobackup = ['lng', 'scr', 'web', 'web/css', 'web/img', 'web/js', 'log', inifolder, '']

    print(_('Backup file name : {}').format(os.path.basename(bkpname)))
    sendstatus(step, _('Backup file name : {}').format(os.path.basename(bkpname)), 0)

    for items in foldertobackup:
        if items != inifolder:
            bkpfolder = folder + items
        else:
            bkpfolder = inifolder
        try:
            os.makedirs(os.path.dirname(bkpname), exist_ok=True)
            with ZipFile(bkpname, "a") as izf:
                for zfiles in os.listdir(bkpfolder):
                    zfiles = os.path.join(bkpfolder, zfiles)
                    if os.path.isfile(zfiles):
                        print(zfiles)
                        izf.write(zfiles)

        except (ValueError, Exception):
            print(traceback.format_exc())
            gen_error('backup', _('Error to backup file : {}').format(os.path.basename(bkpname)))
            return False

    izf.close()

    return True


#
# retrieve Broadlink device usage in Domoticz DB
#
def usage():
    ibrousage = 'Broadlink devices Usage: ---' + (datetime.now().strftime('%Y-%m-%d %H:%M:%S')) + '\n'
    dev_domoticz()
    for items in devices:
        if 'LevelActions' in devices[items]:
            if 'Broadlink-' in base64_to_string(devices[items]['LevelActions']):
                ur_ldome = 'http://' + domip + ':' + domport + '/#/Devices/' + str(devices[items]['idx']) + \
                           '/LightEdit'
                httplink = '''<a onclick = "window.location.href =\'''' + ur_ldome + '''\';" title = "Go" >
                <span style = "cursor: pointer;" >&#127760</span></a>'''
                ibrousage += _('Name : {} -- Unit : {} -- IDX : {} ').format(items, devices[items]['Unit'],
                                                                             devices[items]['idx']) + httplink + '\n'
                ibrousage += _('Detected here : ') + base64_to_string(devices[items]['LevelActions']) + '\n'
                ibrousage += ('=' * 40) + '\n'

        if 'StrParam1' in devices[items]:
            if 'Broadlink-' in base64_to_string(devices[items]['StrParam1']):
                ur_ldome = 'http://' + domip + ':' + domport + '/#/Devices/' + str(devices[items]['idx']) + \
                           '/LightEdit'
                httplink = '''<a onclick = "window.location.href =\'''' + ur_ldome + '''\';" title = "Go" >
                <span style = "cursor: pointer;" >&#127760</span></a>'''
                ibrousage += _('Name : {} -- Unit : {} -- IDX : {} ').format(items, devices[items]['Unit'],
                                                                             devices[items]['idx']) + httplink + '\n'
                ibrousage += _('Detected here : ') + base64_to_string(devices[items]['StrParam1']) + '\n'
                ibrousage += ('=' * 40) + '\n'

        if 'StrParam2' in devices[items]:
            if 'Broadlink-' in base64_to_string(devices[items]['StrParam2']):
                ur_ldome = 'http://' + domip + ':' + domport + '/#/Devices/' + str(devices[items]['idx']) + \
                           '/LightEdit'
                httplink = '''<a onclick = "window.location.href =\'''' + ur_ldome + '''\';" title = "Go" >
                <span style = "cursor: pointer;" >&#127760</span></a>'''
                ibrousage += _('Name : {} -- Unit : {} -- IDX : {} ').format(items, devices[items]['Unit'],
                                                                             devices[items]['idx']) + httplink + '\n'
                ibrousage += _('Detected here : ') + base64_to_string(devices[items]['StrParam2']) + '\n'
                ibrousage += ('=' * 40) + '\n'

        if 'HardwareID' in devices[items]:
            if str(devices[items]['HardwareID']) == str(hwid):
                ur_ldome = 'http://' + domip + ':' + domport + '/#/Devices/' + str(devices[items]['idx']) + \
                           '/LightEdit'
                httplink = '''<a onclick = "window.location.href =\'''' + ur_ldome + '''\';" title = "Go" >
                <span style = "cursor: pointer;" >&#127760</span></a>'''
                ibrousage += _('Name : {} -- Unit : {} -- IDX : {} ').format(items, devices[items]['Unit'],
                                                                             devices[items]['idx']) + httplink + '\n'
                ibrousage += _('Domoticz device created') + '\n'
                ibrousage += ('=' * 40) + '\n'

    return ibrousage


def multi_code():
    mpath = step[11:]

    if not os.path.exists(mpath):
        gen_error('multi_code', _('ini file not found: {}').format(str(mpath)))

        return False

    config = configparser.ConfigParser()
    config.read(mpath, encoding='utf8')
    iunit = config.get("DEFAULT", "unit")
    loadedcommand = config.get("LearnedCode", iunit)
    if 'ini=' not in loadedcommand:
        gen_error('multi_code', _('bad code in ini file: {}').format(str(mpath)))

        return False

    commandtoexecute = loadedcommand.split('&')
    for items in commandtoexecute:
        print(_('we execute this command : {}').format(items))
        if 'ini=' in items:
            fn = inifolder + items[4:]
            if send_code(fn):
                print(_("Next"))

            else:

                gen_error('multi_code', _("Error to send code"))
        elif 'timer=' in items:
            timetosleep = int(items[6:])
            print(_('We try to sleep : {} s').format(timetosleep))
            if timetosleep > 9:
                gen_error('multi_code', _('bad timer value : {}').format(timetosleep))

            else:

                time.sleep(timetosleep)

        else:

            gen_error('multi_code', _('bad code in ini file: {}').format(str(items)))

    return True


#
# request to send code stored in ini file
#
def send_code(ifname):
    print(_('we send code from : {}').format(ifname))

    if os.path.exists(ifname):
        try:
            config = configparser.ConfigParser()
            config.read(ifname, encoding='utf8')
            unitn = config.get("DEFAULT", "unit")
            iloadedcommand = config.get("LearnedCode", str(unitn))

        except (ValueError, Exception):
            print(traceback.format_exc())
            gen_error('send_code', _('Not able to load command from {}').format(ifname))

            return False

        if not iloadedcommand:
            gen_error('send_code', _('Nothing to send'))

            return False

        iloadedcommand = bytes.fromhex(iloadedcommand)
        if not ISCONNECTED:
            broadlink_connect()
        if ISCONNECTED:
            try:
                DEVICE.send_data(iloadedcommand)
                print(_("Code sent...."))

            except (ValueError, Exception):
                print((traceback.format_exc()))
                gen_error('send_code', _("Warning : Code sent ....Probably timeout"))

                return False

    else:

        gen_error('send_code', _('Not able to find file {}').format(ifname))

        return False

    return True


#
# execute subprocess
#
def mycmd(icommand):
    try:
        subprocess.check_call(icommand, shell=True, timeout=120)

    except subprocess.CalledProcessError as e:
        print('ERROR to start subprocess')
        print(str(e.returncode))
        print(str(e.cmd))
        print(str(e.output))
        return False

    return True


#
# main logic
#
if __name__ == '__main__':

    cgitb.enable(logdir=folder + 'log/')

    code = ''

    if INFOLEVEL == '999':
        try:
            print('Waiting for MS Visual Studio remote debugger connection ....')
            import ptvsd

            ptvsd.enable_attach(address=('0.0.0.0', 6789))
            ptvsd.wait_for_attach()
            ptvsd.break_into_debugger()

        except (ValueError, Exception):
            print(traceback.format_exc())
            print('Not able to set debug mode')
    #
    # capture output
    #
    chk = "Main"
    if interactive != 'yes':
        backup_stdout = sys.stdout
        backup_stderr = sys.stderr
        sys.stdout = open(str(folder) + 'log/' + str(hwid) + chk + 'output.txt', 'w', encoding='utf-8')
        sys.stderr = open(str(folder) + 'log/' + str(hwid) + chk + 'output.err', 'w', encoding='utf-8')
    #
    # load language
    load_lang()
    #
    # Found OS
    #
    if sys.platform.startswith('win32'):
        Platform = "Windows"
    else:
        Platform = "Linux"
    #
    print("-" * 38 + "Start" + "-" * 37)
    print("STEP ==: " + step + " --- " + datetime.now().strftime('%Y-%m-%d %H:%M:%S'))
    #
    #
    if step == 'scan':

        # we retrieve broadlink devices on the network
        try:
            file = folder + "log/" + "scan.txt"
            if os.path.exists(file):
                os.remove(file)
            brodevices = discover()
            with open(file, 'w', encoding='utf-8') as f:
                f.write(brodevices)
            status = (_('Discover finished'))
            code = '0'

        except (ValueError, Exception):
            print(traceback.format_exc())
            status = (_('Error to retrieve Broadlink devices'))
            code = '1'

        sendstatus(step, status, code)
        time.sleep(5)
        sendend(step, _('END scan'))

    elif step == 'learnir':

        if learnir():
            code = '0'
            status = _('IR code learned')

        else:

            code = '1'
            status = _('Error to learn IR code')

        sendstatus(step, status, code)
        time.sleep(5)
        sendend(step, 'END learnir')

    elif step == 'sweep':

        if sweep():
            code = '0'
            status = _('Sweep ok')

        else:

            code = '1'
            status = _('Error in sweep')

        sendstatus(step, status, code)
        time.sleep(5)
        sendend(step, 'END sweep')

    elif step == 'learnrf':

        if learnrf():
            code = '0'
            status = _('RF code learned')

        else:

            code = '1'
            status = _('Error to learn RF code')

        sendstatus(step, status, code)
        time.sleep(5)
        sendend(step, _('END learnrf'))

    elif step == 'usage':

        file = folder + "log/" + "usage.txt"
        if os.path.exists(file):
            os.remove(file)

        brousage = usage()
        with open(file, 'w', encoding='utf-8') as f:
            f.write(brousage)

        if brousage:
            code = '0'
            status = _('Usage ok')

        else:

            code = '1'
            status = _('Error in usage')

        sendstatus(step, status, code)
        time.sleep(3)
        sendend(step, _('END usage'))
    #
    # generate lang file
    #
    elif step == 'crelang':

        extract_sentence('Dombroadlink.py')
        extract_sentence('plugin.py')

        print(langto)

        sendstatus(step, _('Finished'), '0')
        sendend(step, _('END translation'))
    #
    # Download plugins files from Cloud Drive and update them
    #
    elif step == 'updatePlugin':

        updname = folder + 'updplugin.zip'
        bkpname = folder + 'bkp/bkpplugin-' + str(datetime.now().strftime('%Y-%m-%d-%H%M%S')) + '.zip'

        # importing required modules
        from zipfile import ZipFile

        print(_('We do backup before update'))
        sendstatus(step, _('We do backup before update'), '0')

        if backup():
            try:
                os.makedirs(os.path.dirname(updname), exist_ok=True)
                data = requests.get(url, timeout=10, stream=True, verify=False)
                # Open the output file and make sure we write in binary mode
                with open(updname, 'wb') as fh:
                    # Walk through the request response in chunks of 1024 * 1024 bytes, so 1MiB
                    for chunk in data.iter_content(1024 * 1024):
                        # Write the chunk to the file
                        fh.write(chunk)
                        # Optionally we can check here if the download is taking too long

                print(_('New Plugin uploaded'))
                sendstatus(step, _('New Plugin uploaded'), '0')

            except (ValueError, Exception):
                print(traceback.format_exc())
                print(_('Error receive / save files from Cloud Drive : {}').format(str(url)))
                sys.exit(1)

            # we backup actual lang file to be restored after update (possible user modification)
            lng_file = folder + 'lng/en_' + langto + '.lng'
            lng_file_tmp = folder + 'lng/en_' + langto + '.lng.tmp'
            shutil.copy(lng_file, lng_file_tmp)

            try:
                # opening the zip file in READ mode
                with ZipFile(updname, 'r') as izip:
                    # printing all the contents of the zip file
                    izip.printdir()

                    # extracting all the files
                    print(_('Extracting all the files now...'))
                    izip.extractall(path=folder + '../.')

                # copy back lng file saved previously
                shutil.copy(lng_file_tmp, lng_file)

            except (ValueError, Exception):
                print(traceback.format_exc())
                print(_('Error to extract from : {}').format(updname))
                sys.exit(2)

        else:

            gen_error('updatePlugin', _('Not able to create backup file'))

        try:
            if os.path.exists(updname):
                os.remove(updname)

        except (ValueError, Exception):
            print(traceback.format_exc())
            print('Error to delete this file: ' + updname)

        #
        # Broadlink module not from pip
        #
        mod = '"' + folder + 'python-broadlink-master/.' + '"'

        if Platform == 'Windows':
            command = 'python -m pip install ' + mod

        else:

            command = 'sudo -H python -m pip install ' + mod

        print('-*-')
        print(' We execute this command : ' + command)
        if mycmd(command):
            print(' We have installed : ' + mod)

        else:

            print(' ERROR to install : ' + mod)
            print(' could be normal if already exist, continue in anyway....')

        print(_("If necessary, do 'sudo -H chmod +x *.py'"))
        print(_('End of plugin update'))
        sendstatus(step, _('Finished'), '0')
    #
    # backup plugin files to bkp folder
    #
    elif step == 'backupPlugin':

        bkpname = folder + 'bkp/plugin-' + str(datetime.now().strftime('%Y-%m-%d-%H%M%S')) + '.zip'

        from zipfile import ZipFile

        if backup():
            code = '0'
            msg = _('Backup OK')

        else:
            code = '1'
            msg = _('Backup error')

        sendstatus(step, msg, code)
        print(_('End of plugin backup'))
        sendend(step, _('END of Backup'))
    #
    # remote plugin version test
    #
    elif step == 'remotePlugin':

        if remote_plugin():
            code = '0'
            msg = _('RemotePlugin OK')
            print(_('we have downloaded plugin file for version test'))
            remotever = remote_plugin_ver(folder + 'tst-plugin')
            actualver = remote_plugin_ver(folder + 'plugin.py')
            if remotever != actualver:
                print(_('plugin : new version available'))
                msg = _('plugin : new version available')
                code = '99'

        else:

            code = '1'
            msg = _('RemotePlugin Error')

        sendstatus(step, msg, code)
        time.sleep(2)
        print(_('End of remote plugin version test'))
        sendend(step, _('END of remotePlugin'))
    #
    # multi-code send
    #
    elif 'multi-code' in step:

        if multi_code():
            code = '0'
            msg = _('Multi-code OK')
            print(_('We have sent multi-code'))

        else:

            code = '1'
            msg = _('Multi-code Error')

        sendstatus(step, msg, code)
        time.sleep(2)
        print(_('End of multi-code send'))
        sendend(step, _('END of multi-code'))
    #
    # test only
    #
    elif step == 'test':

        sendstatus("test", "for test only", '0')
        sendend("test", "END test")

    else:

        gen_error('unknown', _('unknown step'))
        #
    print("-" * 39 + "END" + "-" * 38)
