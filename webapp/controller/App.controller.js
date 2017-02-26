sap.ui.define([
		"sap/ui/core/mvc/Controller",
		"sap/m/MessageBox",
		"sap/ui/pp/mobi/model/barcode"
	],
	function(Controller, MessageBox, BarCodeScanner) {
		"use strict";

		return Controller.extend("sap.ui.pp.mobi.controller.App", {

			onInit: function() {

				var self = this;

				//BarCodeScanner.connect(function(barcode) {
				//		self.onScan(barcode);
				//});

			},

			onScan: function(barcode) {
				MessageBox.information("Cod de bare scanat: " + barcode);
				// cum indentific in ce pagina sunt ????
			},

			onExit: function() {
				//BarCodeScanner.disconnect();
			}

		});

	});