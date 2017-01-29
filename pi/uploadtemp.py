from datetime import datetime, date, timedelta
import paramiko


ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy()) # lol YOLO

ssh.connect("kolls.net", username="XXXX", password="XXXX")
sftp = ssh.open_sftp()

begin = datetime(date.today().year, date.today().month, date.today().day) - timedelta(days=1)
ftime = begin.strftime("%Y%m%d")

toupload = "/home/pi/temp/"+ftime+".bin"

sftp.put(toupload, "temperature/" + ftime+".bin")
sftp.close()
ssh.close()



