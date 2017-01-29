import os
import time
from datetime import datetime, date

temp_sensor = '/sys/bus/w1/devices/28-0416843723ff/w1_slave'

def temp_raw():

    f = open(temp_sensor, 'r')
    lines = f.readlines()
    f.close()
    return lines

def read_temp():

    lines = temp_raw()
    while lines[0].strip()[-3:] != 'YES':
        time.sleep(0.2)
        lines = temp_raw()
    temp_output = lines[1].find('t=')
    if temp_output != -1:
        temp_string = lines[1].strip()[temp_output+2:]
        temp_c = float(temp_string) / 1000.0
        temp_f = temp_c * 9.0 / 5.0 + 32.0
        return temp_c, temp_f

(_, f) = read_temp()
ftime = datetime.now().strftime("%Y%m%d")


begin = datetime(date.today().year, date.today().month, date.today().day)
mins = (int)((datetime.now() - begin).total_seconds() / 60)

with open("/home/pi/temp/"+ftime+".bin", "ab") as file:
    while (file.tell() < mins):
        file.write(chr(0))
    file.write(chr(int(round(f*2.0))))
