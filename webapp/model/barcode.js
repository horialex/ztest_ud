sap.ui.define(function() {
	"use strict";

	var BarCodeScanner = {

		connect: function(callback) {
			var code = "";
			var timeStamp = 0;
			var timeout = null;

			this.handler = function(event) {
				if (timeStamp + 50 < new Date().getTime()) {
					code = "";
				}
 

				timeStamp = new Date().getTime();
				clearTimeout(timeout);

				if (event.which != 13) { // ignore returns
					code += String.fromCharCode(event.which);
				}
				timeout = setTimeout(function() {
					var focus = $(":focus");
				    if (focus == undefined || focus.length === 0) {
						if (code.length >= 3) {
							callback(code);
						}
				    }
					else {
						if (code.length >= 3 &&  focus[0].tagName != "INPUT") {
							callback(code);
						}
						else{
							// este intr-un camp de input si trebuie sa accept introducerea prin scanare
						 
						}
					}
				    
					code = "";
				}, 100);
			};

			$('body').on('keypress', this.handler);

		},
		disconnect: function() {
			$('body').off('keypress', this.handler);
		}
	};

	return BarCodeScanner;

}, /* bExport= */ true);