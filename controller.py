#-*- coding:utf-8 -*-
import subprocess
import sys, os
import threading
import signal

    
def database_server_launcher():
    print("Launching Database Server")
    strResultLaunch = subprocess.check_output(["node", "DatabaseServer/bin/www"], universal_newlines=True)
    print(strResultLaunch)

def controller_server_launcher():
    print("Launching Controller Server")
    strResultLaunch = subprocess.check_output(["node", "ControllerServer/bin/www"], universal_newlines=True)
    print(strResultLaunch)

def query_server_launcher():
    print("Launching Query Server")
    strResultLaunch = subprocess.check_output(["node", "QueryServer/bin/www"], universal_newlines=True)
    print(strResultLaunch)

def kill_process():
    p = subprocess.Popen(['ps', '-a'], stdout=subprocess.PIPE)
    out, err = p.communicate()

    for line in out.splitlines():
        try :
            if 'node' in line:
                pid = int(line.split(None, 1)[0])
                print("PID Number : ", pid)
                #os.kill(pid, signal.SIGKILL)
        except TypeError:
                print("No node is running")



if __name__ == "__main__":
    threadDB = threading.Thread(target=database_server_launcher, args=())
    threadCR = threading.Thread(target=controller_server_launcher, args=())
    threadQR = threading.Thread(target=query_server_launcher, args=())

    if sys.argv[1] == 'a':
        # database가 우선이 되어야한다.
        # controller가 database로 연결해야하기 때문
        threadDB.start()
        threadCR.start()
        threadQR.start()
    
    if sys.argv[1] == 'k':
        kill_process()

    if sys.argv[1] == 'd':
        threadDB.start()

    if sys.argv[1] == 'c':
        threadCR.start()

    if sys.argv[1] == 'q':
        threadQR.start()
        