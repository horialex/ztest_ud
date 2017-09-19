sap.ui.define(function() {
	"use strict";

	var Formatter = {
		xfeld: function(value){
			if (value === "X") {
				return true;
			}
			else {
				return false;
			}
		},
		type_input: function(char_type){
			if (char_type === "DATE") {
				return "Date";
			}
			else if (char_type === "TIME") {
				return "Time";
			}
			else if (char_type === "NUM") {
				return "Number";
			}
			else {
				return 'Text';
			}	
		},
		qunat: function(qty,sUoM){
			var decimals = 2; 
			if (sUoM === "ST") {
				decimals = 0;	
			}
			return Number(Math.round(qty+'e'+decimals)+'e-'+decimals);
		},
 
		uom: function(sUoM) {
			if (sUoM === "ST") {
				return "Buc";
			}
			else if (sUoM === "KG") {
				return "Kg";
			}
			else {
				return sUoM;
			}
		},

		status: function(sStatus) {
			if (sStatus === "Available") {
				return "Success";
			} else if (sStatus === "Out of Stock") {
				return "Warning";
			} else if (sStatus === "Discontinued") {
				return "Error";
			} else {
				return "None";
			}
		},

		favorite: function(sStatus) {
			return sStatus.length % 2 === 0;
		},

		docIcon:function(doc_type){
			if (doc_type === 'doc'){
				return 'sap-icon://doc-attachment';
			} else if (doc_type  === 'pdf'){
				return 'sap-icon://pdf-attachment';
			}
			else {
				return 'sap-icon://document';                                                
			}
		},

		formatMessageType: function(type) {
			if (type === 'E') {
				return 'Error';
			} else if (type === 'W') {
				return 'Warning';
			} else if (type === 'I') {
				return 'Information';
			} else if (type == 'S') {
				return 'Success';
			} else {
				return 'None';
			}
		},

		formatMessageTitle: function(type) {
			if (type === 'E') {
				return 'Error';
			} else if (type === 'W') {
				return 'Warning';
			} else if (type === 'I') {
				return 'Information';
			} else if (type === 'S') {
				return 'Success';
			} else {
				return 'None';
			}
		}

	};

	return Formatter;

}, /* bExport= */ true);