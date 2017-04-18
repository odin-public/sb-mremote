# sb-mremote
Web App that generates mRemoteNG config from APS Developer Portal sandbox dump. Requires `nginx` web server.

To install:

```sh
# via 'npm', from any directory into '/var/sb-mremote'

npm i sb-mremote

# from source, from source directory into `/var/sb-mremote`

npm run install
```

Then follow the on-screen instructions:

![](https://i.imgur.com/5sFAMtC.png)

**You can remove the working directory after the installation, it won't affect the service.**

To run the service, you need to make sure you added the `include` directive to your `nginx.conf` (as instructed on standard output during installation, **adjust the config to your liking**) and restarted `nginx`. Then (in `/var/sb-mremote`):

```sh
npm start # you can use 'screen', then enter your dev portal login and password

```

To uninstall (from `/var/sb-mremote`): `npm run uninstall # requires confirmation`

```sh
npm run uninstall # requires confirmation
```

For better debuggability, you can try building from source without minification:
```sh
npm run build nominify # this affects 'main.js' in UI
```

Enjoy!
