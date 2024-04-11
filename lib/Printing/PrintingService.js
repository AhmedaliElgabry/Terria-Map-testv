import { TemplateHandler } from "easy-template-x";
import URI from "urijs";
import PrintingDataService from "./PrintingDataService";

export default class PrintingService {
  printingDataService;
  _terria;

  print(terria, options, shareUrl, data = null, dataService = null) {
    return this.generateReport(terria, options, shareUrl, data, dataService);
  }

  generateReport(
    terria,
    options,
    shareUrl,
    data = null,
    dataService = null,
    params = null
  ) {
    this.printingDataService =
      dataService || new PrintingDataService(terria, shareUrl);
    this._terria = terria;

    return new Promise((resolve, reject) => {
      const {
        dataOptions,
        templateUrl,
        outputOptions,
        otherDatasources
      } = options;

      const _dataP = this.printingDataService.getData(
        dataOptions,
        otherDatasources,
        data,
        params
      );
      const _templateP = this.getTemplate(templateUrl);
      Promise.all([_dataP, _templateP])
        .then(([data, templateFile]) => {
          new TemplateHandler({ maxXmlDepth: 50 })
            .process(templateFile, data)
            .then(doc => {
              this.output(shareUrl, doc, outputOptions, rsp => {
                resolve(rsp);
              });
            });
        })
        .catch(err => reject(err));
    });
  }

  getFilename(shareUrl, extention = null, options = null) {
    let filename, basename;

    if (options && "object" === typeof options) {
      ({ filename } = options);
    }

    if (filename && "string" === typeof filename) {
      basename = filename;
    } else {
      basename = shareUrl
        ? shareUrl.split("share=")[1] || shareUrl
        : "Untitled";
    }

    return `${basename}${extention ? "." + extention : ""}`;
  }

  output(shareUrl, blob, options = {}, cb) {
    const {
      exportToGoogleDocs,
      uploadToGdriveUrl,
      gDriveDirectoryId
    } = options;
    const filename = this.getFilename(shareUrl, "docx", options);
    if (exportToGoogleDocs) {
      const _mime =
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
      this.uploadToGoogleDrive(
        blob,
        {
          filename: filename,
          parentId: gDriveDirectoryId,
          mime: _mime
        },
        uploadToGdriveUrl
      )
        .then(rsp => {
          const { id } = rsp;
          const documentUrl = `https://docs.google.com/document/d/${id}/view`;
          window.open(documentUrl, "_blank", "noopener,noreferrer")?.focus();
          cb({ documentUrl: documentUrl });
        })
        .catch(err => {
          cb(err);
        });
    } else {
      this.saveFile(filename, blob);
      cb("Done");
    }
  }

  uploadToGoogleDrive = async (data, configs, uploadUrl) => {
    const _fd = new FormData();
    _fd.append("options", JSON.stringify(configs));
    _fd.append("data", data);

    try {
      const rsp = await fetch(uploadUrl, {
        method: "POST",
        body: _fd
      });

      return await rsp.json();
    } catch (err) {
      return console.error(err);
    }
  };

  proxyUrl(url, terria) {
    const { corsProxy } = terria;
    const proxiedUrl = corsProxy.getURL(url, "0d");
    const uri = new URI(proxiedUrl);
    return uri.absoluteTo(window.location.href).toString();
  }

  saveFile(filename, blob) {
    const blobUrl = URL.createObjectURL(blob);
    let link = document.createElement("a");
    link.download = filename;
    link.href = blobUrl;
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      link.remove();
      window.URL.revokeObjectURL(blobUrl);
      link = null;
    }, 0);
  }

  getTemplate = url => {
    return new Promise((resolve, reject) => {
      fetch(url, {
        headers: {
          "Content-Type":
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        },
        cache: "force-cache"
      })
        .then(resp => resolve(resp.blob()))
        .catch(err => {
          console.error(
            `An error occred while trying to fetch from :${url}. \nError: ${JSON.stringify(
              err
            )}`
          );
          reject(
            `An error occred while trying to fetch from :${url}. \nError: ${JSON.stringify(
              err
            )}`
          );
        });
    });
  };
}
