// ---------------------------------------------------
// Open mobile native PDF Reader
// ---------------------------------------------------
sap.n.PDF.NativeOpen = function() {

    // Close Dialog
    var dia = AppCache.View[AppCache.CurrentApp].getParent();

    setTimeout(function() {
        dia.close();
    }, 10);


    // Set Directory
    switch (sap.ui.Device.os.name) {

        case 'Android':
            sap.n.PDF.NativeDir = cordova.file.externalCacheDirectory;
            break;

        case 'iOS':
            sap.n.PDF.NativeDir = cordova.file.tempDirectory;
            break;

        case 'winphone':
            sap.n.PDF.NativeDir = cordova.file.externalCacheDirectory;
            break;

        default:
            break;

    }

    // Create Array
    sap.n.PDF.DataArray = sap.n.PDF.MakeBinary(sap.n.PDF.Data);

    // Create and Display File
    window.resolveLocalFileSystemURL(sap.n.PDF.NativeDir, function(dir) {
        dir.getFile("pdfViewer.pdf", {
            create: true
        }, function(file) {
            sap.n.PDF.NativeWriteLog(file);
        });
    });
}

sap.n.PDF.NativeWriteLog = function(file) {

    file.createWriter(function(fileWriter) {

        fileWriter.onwriteend = function(e) {
            cordova.plugins.fileOpener2.open(
                sap.n.PDF.NativeDir + "pdfViewer.pdf",
                "application/pdf", {
                    error: function(e) {
                        console.log('Error open: ' + e.status + ' - Error message: ' + e.message);
                    }
                }
            );
        };

        fileWriter.onerror = function(e) {
            console.log('WRITE ERROR is');
            console.log(e);
        };

        var blob = new Blob([sap.n.PDF.DataArray], {
            type: 'text/pdf'
        });
        fileWriter.write(blob);

    }, sap.n.PDF.NativeWriteFail);
}

sap.n.PDF.NativeWriteFail = function(e) {
    console.log('Error write: ' + e.status + ' - Error message: ' + e.message);
}