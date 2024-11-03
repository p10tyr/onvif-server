# Virtual Onvif Proxy
This is a simple virtual ONVIF proxy that was originally developed by Daniela Hase to work around limitations in the third party support of Unifi Protect.
It takes an existing RTSP stream and builds a virtual ONVIF device for it so the stream can be consumed by ONVIF compatible clients.

Currently only Onvif Profile S (Live Streaming) is implemented with limited functionality.

## Credits
Thank you Daniela Hase for dropping the amazing code to the public!
Original repository https://github.com/daniela-hase/onvif-server

It has truly inspired me and gave me so many ideas! 
I couldnt resist or wait so I had to fork your original code so that I could implement all my ideas.

## Unifi Protect
Unifi Protect 5.0 introduced support for third party cameras that allow the user to add Onvif compatible cameras to their Unifi Protect system.

Unifi Protect seems to only support h264 video streams at the moment. So ensure your real camera encodes videos with h264 in normal or high profile. Do not use h264+

At the time of writing this, version 5.0.34 of Unifi Protect unfortunately has some limitations and does only support cameras with a single high- and low quality stream. Unfortunately video recorders that output multiple cameras (e.g. Hikvision / Dahua XVR) or cameras with multiple internal cameras are not properly supported.

Your Virtual Onvif Devices should now automatically show up for adoption in Unifi Protect as the name specified in the config. The username and password are the same as on the real Onvif device.

---

# Roadmap
- Simplyfy docker - DONE
  - Only run in Docker - DONE
  - Auto virtual MAC registrations - DONE
- Learn about the ONVIF Profile S
  - Implement snapshot functionality?
  - Implement some other features


# Docker Compose

Create a directory locally where you will keep your compose and config files.

## Download the compose.yaml file 

You don't really have to change anything in this file.

Some properties
- `volumnes: ./config.yaml:/onvif.yaml` - where your config file is. Next step
- `cap_add: NET_ADMIN` - Required to create virtual networks based on config file
- `environment: DEBUG:1` - Uncommnet if you need more debug logs to show up


## Downlaod the config file

Download the `config.yaml` file. This is the config that creates virtual proxies and connects them RTSP streams.

> No username of passwords required here!

IP and MAC addresses will be added automatically to the dev device you specify.
Make sure they are avaiable and reserved as static in your router

```yaml
onvif:
  - name: BulletCam                               # A user define name that will show up in the consumer device
    uuid: ae426b06-36aa-4c89-84fb-0000000000a1    # A randomly chosen UUID (see below)
    dev: enp2s0 #eth0                             # Network interface to add virtual IP's too. use ip addr to find your name
    ipv4: 192.168.1.12                            # The available IPv4 on your network. best reserve static ip for this
    mac: aa:aa:aa:aa:aa:a1                        # The virtual MAC address for the server to run on
    ports:                                        # Virtual server ports. No need to change these.
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
This tool is  used to create Onvif devices from regular RTSP streams by creating the following configuration

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
