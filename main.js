const tcpProxy = require('node-tcp-proxy');
const onvifServer = require('./src/onvif-server');
const configBuilder = require('./src/config-builder');
const package = require('./package.json');
const argparse = require('argparse');
const readline = require('readline');
const stream = require('stream');
const yaml = require('yaml');
const fs = require('fs');
const logger = require('simple-node-logger').createSimpleLogger();

const parser = new argparse.ArgumentParser({
    description: 'Virtual RTSP to ONVIF proxy'
});

parser.add_argument('-v', '--version', { action: 'store_true', help: 'show the version information' });
parser.add_argument('config', { help: 'config filename to use', nargs: '?'});

let args = parser.parse_args();

if (args) {
    if (args.version) {
        logger.info('Version: ' + package.version);
        return;
    }

    if (process.env.DEBUG){
        logger.setLevel('trace');
    }

    if (args.config) {
        let configData;
        try {
            configData = fs.readFileSync(args.config, 'utf8');
        } catch (error) {
            if (error.code === 'ENOENT') {
                logger.info('File not found: ' + args.config);
                return -1;
            }
            throw error;
        }

        let config;
        try {
            config = yaml.parse(configData);
        } catch (error) {
            logger.info('Failed to read config, invalid yaml syntax.')
            return -1
        }

        let proxies = {};
        let proxyCounter = 0;
        for (let onvifConfig of config.onvif) {
            let server = onvifServer.createServer(onvifConfig, proxyCounter);

            if (server.getHostname()) {
                logger.info(`Starting virtual onvif server for ${onvifConfig.name} on ${server.getHostname()}`) //:${onvifConfig.ports.server} ...`);
                server.startServer()
                server.startDiscovery()
                if (process.env.DEBUG)
                    server.enableDebugOutput()
                logger.info('  Started!')
                logger.info('')

                if (!proxies[onvifConfig.target.hostname])
                    proxies[onvifConfig.target.hostname] = {}
                
                if (onvifConfig.ports.rtsp && onvifConfig.target.ports.rtsp)
                    proxies[onvifConfig.target.hostname][onvifConfig.ports.rtsp] = onvifConfig.target.ports.rtsp;
                if (onvifConfig.ports.snapshot && onvifConfig.target.ports.snapshot)
                    proxies[onvifConfig.target.hostname][onvifConfig.ports.snapshot] = onvifConfig.target.ports.snapshot;
            } else {
                logger.error(`Failed to find IP address for MAC address ${onvifConfig.mac}`)
                return -1;
            }
            proxyCounter++
        }
        
        for (let destinationAddress in proxies) {
            for (let sourcePort in proxies[destinationAddress]) {
                logger.info(`Starting tcp proxy from port ${sourcePort} to ${destinationAddress}:${proxies[destinationAddress][sourcePort]} ...`);
                tcpProxy.createProxy(sourcePort, destinationAddress, proxies[destinationAddress][sourcePort]);
                logger.info('  Started!');
                logger.info('');
            }
        }

    } else {
        logger.info('Please specifiy a config filename!');
        return -1;
    }

    return 0;
}