import { autoUpdater } from "electron-updater";
import { ipcMain, session } from "electron";
import log from "electron-log";

// I hope you know what you are doing here
//
//                       :::!~!!!!!:.
//                   .xUHWH!! !!?M88WHX:.
//                 .X*#M@$!!  !X!M$$$$$$WWx:.
//                :!!!!!!?H! :!$!$$$$$$$$$$8X:
//               !!~  ~:~!! :~!$!#$$$$$$$$$$8X:
//              :!~::!H!<   ~.U$X!?R$$$$$$$$MM!
//              ~!~!!!!~~ .:XW$$$U!!?$$$$$$RMM!
//                !:~~~ .:!M"T#$$$$WX??#MRRMMM!
//                ~?WuxiW*`   `"#$$$$8!!!!??!!!
//              :X- M$$$$       `"T#$T~!8$WUXU~
//             :%`  ~#$$$m:        ~!~ ?$$$$$$
//           :!`.-   ~T$$$$8xx.  .xWW- ~""##*"
// .....   -~~:<` !    ~?T#$$@@W@*?$$      /`
// W$@@M!!! .!~~ !!     .:XUW$W!~ `"~:    :
// #"~~`.:x%`!!  !H:   !WM$$$$Ti.: .!WUn+!`
// :::~:!!`:X~ .: ?H.!u "$$$B$$$!W:U!T$$M~
// .~~   :X@!.-~   ?@WTWo("*$$$W$TH$! `
// Wi.~!X$?!-~    : ?$$$B$Wu("**$RM!
// $R@i.~~ !     :   ~$$$$$B$$en:``
// ?MXT@Wx.~    :     ~"##*$$$$M~
class AutoUpdate {
  constructor(webAppWindow) {
    this.webAppWindow = webAppWindow;

    log.transports.file.level = 'verbose';
    autoUpdater.logger = log;
    autoUpdater.autoDownload = true;
    this.requestlyBlocked = false;

    session.defaultSession.webRequest.onBeforeRequest(
      { urls: ["*://*.requestly.io/*"] },
      (details, callback) => {
        if (this.requestlyBlocked) return callback({ cancel: true });
        return callback({});
      }
    );

    this.updateAvailable = false;
    this.availableUpdateDetails = {};
    this.updateDownloaded = false;
    this.downloadedUpdateDetails = {};

    this.init_events();

    autoUpdater
      .checkForUpdates()
      .catch((e) => log.error("auto update check failed", e));
  }

  init_events = () => {
    autoUpdater.on("update-available", (updateInfo) => {
      log.info("update available", updateInfo);
      this.updateAvailable = true;
      this.availableUpdateDetails = updateInfo;

      if (this.webAppWindow && this.webAppWindow.webContents)
        this.webAppWindow.webContents.send("update-available", updateInfo);
    });

    autoUpdater.on("checking-for-update", () => {
      log.info("checking-for-update");
    });

    autoUpdater.on("update-not-available", () => {
      log.info("update-not-available");
      this.requestlyBlocked = true;
    });

    autoUpdater.on("download-progress", (progressObj) => {
      if (this.webAppWindow && this.webAppWindow.webContents) {
        this.webAppWindow.webContents.send("download-progress", progressObj);
      }
    });

    autoUpdater.on("update-downloaded", (updateInfo) => {
      log.info("update downloaded", updateInfo)
      this.updateDownloaded = true;
      this.downloadedUpdateDetails = updateInfo;

      this.requestlyBlocked = true;

      if (this.webAppWindow && this.webAppWindow.webContents) {
        this.webAppWindow.webContents.send("update-downloaded", updateInfo);
      }
    });

    autoUpdater.on("err", (err)=> {
      log.error("error received on autoupdater", err);
    })

    autoUpdater.on("before-quit-for-update", (info) => {
      log.info("before-quit-for-update event triggered", info)
    });

    autoUpdater.on("before-quit", (info) => {
      log.info("before-quit event triggered", info)
    });

    ipcMain.handle("check-for-updates", async () => {
      this.requestlyBlocked = false;
      return autoUpdater.checkForUpdates();
    });

    ipcMain.handle("download-update", async () => {
      this.requestlyBlocked = false;
      return autoUpdater.downloadUpdate();
    });

    ipcMain.handle("quit-and-install", () => {
      log.info("recieved quit and install")
      global.quitAndInstall = true;
      let res = autoUpdater.quitAndInstall();
      log.info("finished quit and install", res)
    });
  };
}

export default AutoUpdate;
