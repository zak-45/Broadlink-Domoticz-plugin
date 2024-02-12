# -*- coding: utf-8 -*-
#
#   Setup for automatic installation
#
#   Part of Domoticz plugin: Broadlink
#
#           Dev. Platform : Win10 x64 & Py 3.7.5 x86
#
#           Author:     zak45, 2020
#           1.0.0:  initial release
#           1.0.1:  added irgen module
#

import socket
import os
import sys
import subprocess
import urllib.request
import urllib.parse
import urllib.error
import json
import traceback
import cgitb
from zipfile import ZipFile
import time

#
# python version check
# if < 3.8 error
try:
    assert sys.version_info >= (3, 8)
except (ValueError, Exception):
    print('your python version is not compatible, need >= 3.8')
    sys.exit()
#
cgitb.enable(format='text')
#
# Var value
#
setupurl = 'https://codeload.github.com/zak-45/Broadlink-Domoticz-plugin/zip/refs/heads/main'
modlist = ['cryptography==36.0.0', 'setuptools', 'wheel', 'googletrans', 'translate',
           'requests', 'requests_toolbelt', 'irgen',
           'broadlink==0.18.3']
updname = 'BroadlinkSetup.zip'
data = {}
#
# Found OS
#
if sys.platform.startswith('win32'):
    Platform = "Windows"
else:
    Platform = "Linux"


#
# check if port is already opened or not
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
# execute json request to Domoticz
#
def exe_domoticz(params):
    try:
        params = urllib.parse.urlencode(params)
        html = urllib.request.urlopen('http://' + str(Domoticz) + ':' + str(Port) + '/json?type=command&' + params, timeout=20)
        response = html.read()
        encoding = html.info().get_content_charset('utf-8')
        idata = json.loads(response.decode(encoding))
        print('Request from domoticz to : ' + params)

    except (ValueError, Exception):
        print(traceback.format_exc())
        print('Error sending command to Domoticz :' + params)
        sys.exit()

    return idata


#
# find language from Domoticz
#
def domlang():
    params = {'param': 'getsettings'}
    idata = exe_domoticz(params)
    if not idata:
        print('Error to get settings from Domoticz')
        sys.exit()

    else:

        idomlang = idata["Language"]

    return idomlang


#
# execute subprocess
#
def mycmd(icommand):
    try:
        subprocess.check_output(icommand, shell=True, timeout=120)

    except subprocess.CalledProcessError as e:
        print('ERROR to start subprocess')
        print(str(e.returncode))
        print(str(e.cmd))
        print(str(e.output))
        return False

    return True


#
# Begin
#
print('*')
print('=' * 80)
print('*')
print(' ' * 20, 'Broadlink Plugin Installation')
print('*')
print('=' * 80)
print('*')
print('Python %s on %s' % (sys.version, sys.platform))
#
# We need domoticz Net info
#
print('_' * 40)
print("# We need Domoticz Net info")
print('-' * 40)
Domoticz = input('ENTER Domoticz IP address (e.g. 192.168.1.45): ')
Port = input('ENTER Domoticz Port Number (e.g. 8080): ')
#
# We check can reach Domoticz
#
if is_open(Domoticz, Port):
    print('IP/PORT OK')

else:

    print('ERROR : Not able to reach Domoticz')
    sys.exit()
#
# display working folder
#
if Platform == 'Windows':
    command = 'cd '

else:

    command = 'sudo pwd '
#
if mycmd(command):
    print('Installation initialized ......  ')

else:

    print('ERROR to retrieve folder information')
    sys.exit()
#
# Initial check
#

#
# we retrieve Domoticz language
#
print('_' * 40)
print('# we retrieve Domoticz language ')
lang = domlang()
print('We work with this language : ' + lang)
print('On this platform : ' + Platform)
#
# we install necessary modules
#
print('_' * 40)
print("# we install necessary modules")
print('-' * 40)
#
#
for mod in modlist:

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
#
# we download plugin files from GIT (zip format)
#
print('_' * 40)
print("# we download plugin files from GIT (zip format)")
print('-' * 40)
#
#

import requests
import shutil

state = "**"
leng = 0
try:
    data = requests.get(setupurl, timeout=10, stream=True, verify=False)
    # Open the output file and make sure we write in binary mode
    print('We download plugin files to: ' + updname)
    with open(updname, 'wb') as fh:
        # Walk through the request response in chunks of 1024 * 1024 bytes, so 1MiB
        for chunk in data.iter_content(1024 * 1024):
            # Write the chunk to the file
            fh.write(chunk)
            leng = leng + len(chunk)
            try:
                print("\r>> Bytes downloaded -->" + state + str(leng) + state, end='', flush=True)

            except (ValueError, Exception):
                print("Bytes downloaded -->" + str(leng))
            # Optionally we can check here if the download is taking too long

    print(': 100% Done')

except (ValueError, Exception):
    print(traceback.format_exc())
    print('Error receive / save files from Gdrive : ' + str(setupurl))
    sys.exit(0)

time.sleep(2)
#
# we extract necessary plugin files
#
print('_' * 40)
print('# we extract necessary plugin files')
print('-' * 40)

# opening the zip file in READ mode
with ZipFile(updname, 'r') as izip:
    # printing all the contents of the zip file
    izip.printdir()

    # extracting all the files
    print('Extracting all the files now...')
    izip.extractall('./')

izip.close()

#
# We do necessary final modifications depend of Platform
#
print('_' * 40)
print('# We do necessary modifications depend of Platform')
print('-' * 40)
#
#
if Platform == 'Linux':
    command = 'sudo chmod +x *.py '
    if mycmd(command):
        print(' put *.py files executable (+x) OK')

    else:

        print(' ERROR to put +x to  *.py files ')
        sys.exit()
    command = 'sudo chmod +x scr/*.sh '
    if mycmd(command):
        print(' put *.sh files executable (+x) OK')

    else:

        print(' ERROR to put +x to  *.sh files ')
        sys.exit()
    try:
        if os.path.exists('scr/dombr.cmd'):
            os.remove('scr/dombr.cmd')

    except (ValueError, Exception):
        print(traceback.format_exc())
        print('Error to delete this file: scr/dombr.cmd')

else:

    try:
        if os.path.exists('scr/dombr.sh'):
            os.remove('scr/dombr.sh')

    except (ValueError, Exception):
        print(traceback.format_exc())
        print('Error to delete this file: scr/dombr.sh')
#
try:
    if os.path.exists(updname):
        os.remove(updname)

except (ValueError, Exception):
    print(traceback.format_exc())
    print('Error to delete this file: ' + updname)

#
# Final check
#
print('_' * 40)
print('Checking installation ....')
print('-' * 40)
#
# We check all modules :
modlist = ['googletrans', 'translate', 'requests', 'requests_toolbelt', 'irgen', 'broadlink']

modules = []
for x in modlist:
    try:
        modules.append(__import__(x))
        print("Successfully imported " + x)

    except ImportError:
        print("Error importing " + x)
        sys.exit()
#
# we check directory structure
mydir = ['ini', 'lng', 'log', 'scr', 'web']

for items in mydir:
    if os.path.exists(items):
        print('Directory {} exist, OK'.format(items))

    else:

        print('Error : Directory {} do not exist, verify error... exiting'.format(items))
        sys.exit()
#
# we check files
if os.path.exists(updname):
    print('Error : zip file : {} still exist, not normal !!!'.format(updname))
    sys.exit()

filelist = ['plugin.py', 'Dombroadlink.py']

for items in filelist:
    if os.path.exists(items):
        print('File {} exist, OK'.format(items))

    else:

        print('Error : File {} do not exist, verify error... exiting'.format(items))
        sys.exit()

#
# End of installation
#
print('*')
print('=' * 80)
print('*')
print(' ' * 20, 'Broadlink Plugin Installed')
print('*')
print(' ' * 20, 'You need to restart Domoticz before use it.')
print('*')
print(' ' * 20, 'Enjoy!!!')
print('*')
print('=' * 80)
print('*')
