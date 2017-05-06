const electron = require('electron');
const autoUpdater = electron.autoUpdater;
const currentVersion = electron.app.getVersion();
const os = require('os');
const request = require('request');
const semver = require('semver');

const repo = 'freeedomofpress/sunder' // TODO: verify this repo is accurate once public


module.exports = function autoUpdate(browserWindow) {

  if (process.platform !== 'linux') {
    // TODO: Fix this url when nuts instances deployed
    const nutsUrl = process.env.NUTS_URL || 'https://updates.freedom.press';
    const feedUrl = `${nutsUrl}/update/${os.platform()}_${os.arch()}/${currentVersion}`;
    console.log('checking for updates at', feedUrl);
    // This will error out in development because the running binary is unsigned
    if (process.env.NODE_ENV === 'production') {
      autoUpdater.setFeedURL(feedUrl);

      autoUpdater.addListener(
        'update-downloaded', (event, releaseNotes, releaseName, releaseDate, updateUrl) => {
          electron.dialog.showMessageBox(browserWindow, {
            type: 'info',
            buttons: ['Install & Restart', 'Later'],
            defaultId: 0, // Index of pre-selected button
            title: 'Update Available',
            // Should include change log or something
            message: 'An update is available',
            detail: 'We recommend you install it now.',
            cancelId: 1, // Return the cancel id if the user closes dialog without clicking a button
          }, (response) => {
            if (response === 0) {
              setTimeout(() => autoUpdater.quitAndInstall(), 1);
            } else {
              console.log('canceled');
            }
          });
        });

      autoUpdater.addListener('error', (error) => {
        console.log('encountered error', error.message);
      });

      autoUpdater.checkForUpdates();
    }
  } else { // linux
    const options = {
      url: `https://api.github.com/repos/${repo}/releases/latest`,
      headers: {
        'User-Agent': 'Sunder'
      }
    }
    request(options, (error, response, body) => {
      if (error) {
        console.log(error);
        // Fail silently
        return;
      }

      try {
        body = JSON.parse(body);
      } catch (e) {
        console.log(e);
        return;
      }

      if (!semver.valid(body.tag_name)) {
        console.error(`Invalid version for latest release returned by GitHub: ${body.tag_name}`);
        return;
      }

      if (!semver.valid(currentVersion)) {
        console.error(`Invalid current version: ${currentVersion}`);
        return;
      }

      if (semver.gt(body.tag_name, currentVersion)) {
        electron.dialog.showMessageBox(browserWindow, {
          type: 'info',
          buttons: ['Ok'],
          defaultId: 0, // Index of pre-selected button
          title: 'Update Available',
           // Should include change log or something
          message: 'An update is available',
          detail: `We recommend you install it now through your package manager or by visiting ${body.html_url}.`,
          cancelId: 0, // Return the cancel id if the user closes dialog without clicking a button
        });
      }
    });
  }
};
