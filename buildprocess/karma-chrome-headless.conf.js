'use strict';

const createKarmaBaseConfig = require('./createKarmaBaseConfig');
const puppeteer = require('puppeteer');
process.env.CHROME_BIN = puppeteer.executablePath();

/*global require*/

module.exports = function (config) {
    const options = Object.assign({}, createKarmaBaseConfig(config), {
        browsers: ['ChromeHeadlessNoSandbox'],
        detectBrowsers: {
            enabled: false,
            usePhantomJS: false
        },
        customLaunchers: {
            ChromeHeadlessNoSandbox: {
                base: 'ChromeHeadless',
                flags: ['--no-sandbox', '--headless']
            }
        }
    });

    options.frameworks.push('detectBrowsers');

    config.set(options);
};
