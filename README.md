# Virtual Onvif Proxy
This is a continuation from the simple virtual ONVIF proxy that was originally developed by Daniela Hase.

It takes an existing RTSP streams and builds a virtual ONVIF Proxy devices as a work around limitations for Unifi Protect

This repository has added features and enchanched the original code by ...
- making it a pure docker appliance (docker-compose)
- only deals with RSTP to ONVIF proxying
- auto registers multiple virtual addresses from inside docker
- more to come...

What can you adopt?
- Adopt `IP camera --> RTSP (h264) --> Protect` 
- Adopt `Raspberry Pi Camera --> uv4l --> RTSP (h254) -- Protect`
- Adopt `Analog --> NVR --> RTSP (h264) --> Protect` 
- Adopt `WebCam --> go2rtc --> RTSP (h264) --> Protect`
- Adopt `... Anything RTSP --> Protect`

IP camera --> RTSP (h264) --> Protect

![image](https://github.com/user-attachments/assets/7fa9ab55-7830-4602-a1e5-d1ad9184117e)

Analog! --> NVR --> RTSP (h264) --> Protect

![analog-dvr-rtsp](https://github.com/user-attachments/assets/ef401f8d-c56c-4ab0-8a44-630823a35ad7)



### Credits
Thank you Daniela Hase for relasing the original script to the public!
Original repository https://github.com/daniela-hase/onvif-server

It has truly inspired me and gave me so many ideas! 
That is why I had to fork your original repo so that I could develop this further to be a docker appliance.

### Unifi Protect
Tested on Unifi Protect 5.0.40+

Once the device shows up in protect, make sure the correct MAC address is assigned to the IP before adopting. 
You can then adopt it and provide the username and password that are set on the real RTSP device.

Known Limitations

> "Third-party features such as analytics, audio playback, and pan-tilt-zoom (PTZ) control are not supported." - Unify Support

- Seems to only support recording normal/high profile h264 video streams at the moment
- Your luck with h265 may vary
- Scrubbing does not seem to work? Possibly depends on the h264 implementaion on the camera
- Snapshot not implemented yet. Hope it works.
- HighProfile support only for now - You can supply LowProfile but that shows up as an extra camera.

---

## Roadmap
- Simplyfy docker - DONE
  - Only run in Docker - DONE
  - Auto virtual MAC registrations - DONE
  - More debug messages - DONE
- Learn about the ONVIF Profile S
  - Implement snapshot functionality?
  - Implement some other features?


# Getting started and Docker (Compose)

> I have enabled debug in compose as default for now so you can read and copy out the logs out if needed

## Konwn problems

Usuaully mulitple camera will just work out the box with the same server ports working for each virtual IP 

If you seem to have problems like
- MAC Addresses not showing properly for multiple cameras in Protect
- Port numbers in use error during startup
- MAC shows the wrong IP

Generally depends from OS to OS. 
Eg in Ubuntu 22. 

You need to run these commands to allow virtual interface max advertising - but you still need a differnt port per virtual IP

```bash
sudo sysctl -w net.ipv4.conf.all.arp_ignore=1
sudo sysctl -w net.ipv4.conf.all.arp_announce=2
```

## Router setup

Firstly you will have to add static DHCP reservations in your router for each virtual onvif device.
Figure out how many RTSP streams you want to add, find an ip range for these. I recomend to keep things simple, for example

Add these static reservatation in before running any dcoker files

Device 1
- onvif_proxy_1
- IP 192.168.51
- MAC 0A:00:00:00:00:51

Device2
- onvif_proxy_2
- IP 192.168.52
- MAC 0A:00:00:00:00:52

TIPS
- MAC starting with `x2:xx:xx:xx:xx:xx`,`x6:xx:xx:xx:xx:xx`,`xA:xx:xx:xx:xx:xx` and `xE:xx:xx:xx:xx:xx` are Locally Administered Addresses (LAA) and wont clash with real devices
- Usually the same server port numbers per MAC/IP works fine with host newrok but some OS's or network drivers dont support that and you need to tweak the server ports


## Docker compose

Create a directory locally where you will keep your compose and config files.

1. Create a directory and change into it
  - `mkdir rtsp-to-onvif` and `cd rtsp-to-onvif`
2.  Download the compose.yaml file
  - `wget https://raw.githubusercontent.com/p10tyr/rtsp-to-onvif/refs/heads/release/compose.yaml`
3. Download the config.yaml
  - `wget https://raw.githubusercontent.com/p10tyr/rtsp-to-onvif/refs/heads/release/config.yaml`
4. Edit and configure your cameras
  - `nano config.yaml`
5. Run compose in attached mode and check for any messages. 
  - `sudo docker compose up`
6. If you see the camera and mac show up in Protect run docker in detached mode, Dockge, Portainer, etc...
  - `sudo docker compose up d`

### Download the compose.yaml file 

You don't really have to change anything in this file.
It has all the settings and permsions required to make it just work.

Some properties
- `volumnes: ./config.yaml:/onvif.yaml` - where your config file is. Next step
- `cap_add: NET_ADMIN` - Required to create virtual networks based on config file
- `environment: DEBUG:1` - Uncommnet if you need more debug logs to show up


### Downlaod the config file

Download the `config.yaml` file. This is the config that creates virtual proxies and connects them RTSP streams.

> No username of passwords required here!
IP and MAC addresses will be added automatically to the dev device you specify.
Make sure they are avaiable and reserved as static in your router

```yaml
onvif:
  - name: BulletCam                               # A user define named that will show up in the consumer device. use letters only, no spaces or special characters
    uuid: ae426b06-36aa-4c89-84fb-0000000000a1    # A randomly chosen UUID (see below)
    dev: enp2s0 #eth0                             # Network interface to add virtual IP's too. use ip addr to find your name
    ipv4: 192.168.1.12                            # The available IPv4 on your network. Reserve static IP for this
    mac: 0A:00:00:00:00:12                        # A virtual Locally Administered Addresses (LAA) MAC address for the server to bind to
    ports:                                        # Virtual server ports. No need to change these unles you run into port already in use problems
      server: 8081
      rtsp: 8554
      snapshot: 8080
    highQuality:
      rtsp: /Streaming/Channels/101/                    # The RTSP Path
      snapshot: /ISAPI/Streaming/Channels/101/picture   # Snapshot path - not working yet
      width: 2048                                       # The Video Width
      height: 1536                                      # The Video Height
      framerate: 15                                     # The Video Framerate/FPS
      bitrate: 3072                                     # The Video Bitrate in kb/s
      quality: 4                                        # Quality, leave this as 4 for the high quality stream.
    target:
      hostname: 192.168.1.187                      # Your cameras IPv4 address
      ports:
        rtsp: 554                                  # Your cameras RTSP port. Typically 554
        snapshot: 80                               # Cameras non https port for snapshots
```


### Other stuff

Remove a virutal IP on the host without rebooting
`sudo ip link del dev rtsp2onvif_<number>`

## Run compose

```bash
# For example, compose.yaml and config.yaml in this directory
~$ cd /onvif-to-rtsp

# Run this command to see the terminal output and any debug messages. CTRL+C to stop
~/onvif-to-rtsp$ sudo docker compose up

# If all is good then run docker compose and detach so it runs in background
~/onvif-to-rtsp$ sudo docker compose up -d
```

## Wrapping an RTSP Stream
This tool is used to create ONVIF devices from regular RTSP streams by creating the following configuration.

Cameras before ONVIF had all kinds of weird and wonderful implemenations

You will have to find out the stream and snapshot details with your own research, by seraching the web for URLS.
You should verify the stream using VLC and the snapshot URL using a browser.

Things to look out for
- http is enabled (for snapshots)
- if snapshot is not working, try admin account. some cameras are like that
- rtsp is enabled ideally on port 554



**RTSP Example:**
Assume you have this RTSP stream:
```txt
rtsp://192.168.1.32:554/Streaming/Channels/101/
       \__________/ \_/\______________________/
            |       Port    |
         Hostname           |
                          Path
```
If your RTSP url does not have a port it uses the default port 554.

Your RTSP url may contain a username and password - those should NOT be included in the config file.
Instead you will have to enter them in the software that you plan on consuming this Onvif camera in, for example during adoption in Unifi Protect.

Next you need to figure out the resolution and framerate for the stream. If you don't know them, you can use VLC to open the RTSP stream and check the _Media Information_ (Window -> Media Information) for the _"Video Resolution"_ and _"Frame rate"_ on the _"Codec Details"_ page, and the _"Stream bitrate"_ on the _"Statistics"_ page. The bitrate will fluctuate quite a bit most likely, so just pick a number that is close to it (e.g. 1024, 2048, 4096 ..).

You can either randomly change a few numbers of the UUID, or use a UUIDv4 generator[^3].

If you have a separate low-quality RTSP stream available, fill in the information for the `lowQuality` section above but this shows up as a seperate camera in unify. 

> [!NOTE]
> Since we don't provide a snapshot url you will onyl see the Onvif logo in certain places in Unifi Protect where it does not show the livestream.

[^1]: [What is MacVLAN?](https://ipwithease.com/what-is-macvlan)
[^2]: [Wikipedia: Locally Administered MAC Address](https://en.wikipedia.org/wiki/MAC_address#:~:text=Locally%20administered%20addresses%20are%20distinguished,how%20the%20address%20is%20administered.)
[^3]: [UUIDv4 Generator](https://www.uuidgenerator.net/)
[^4]: [Virtual Interfaces with different MAC addresses](https://serverfault.com/questions/682311/virtual-interfaces-with-different-mac-addresses)
