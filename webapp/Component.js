sap.ui.define([
	"sap/ui/core/UIComponent",
	"sap/ui/Device",
	"sap/ui/model/json/JSONModel",
	"sap/ui/pp/mobi/model/OrderListModel",
	"sap/m/MessageToast",
	"sap/m/MessageBox"

], function(UIComponent, Device, JSONModel,OrderListModel, MessageToast, MessageBox) {
	"use strict";

	return UIComponent.extend("sap.ui.pp.mobi.Component", {

		metadata: {
			manifest: "json"
		},

		init: function() {

			// este lansat progrmul din SAP Fiori Client ?
			var notFromFiori = false;	
			var path = jQuery(location).attr('href');
			if (path.search('FioriLaunchpad.html') === -1 ) {
				notFromFiori = true;
			}  
			// call the init function of the parent
			UIComponent.prototype.init.apply(this, arguments);

			var oModel = new JSONModel();
			this.setModel(oModel, "messages");

			oModel = new JSONModel();
			this.setModel(oModel, "controls");

			//http://hvsrvsap3.rombat.local:8000/sap/bc/ui2/start_up
			//		var deviceModel = new sap.ui.model.json.JSONModel({
			oModel = new JSONModel({
				user: "dhongu",
				pass: "Milka2017,"
			});
			//oModel.setDefaultBindingMode("OneWay");
			this.setModel(oModel, "currentUser");

			var oConfig = {
				btnLogout: false, //ascundere buton Logout daca nu e nimeni logat
				btnAuthen: true,
				clientSAP: "400",  // de extras clientul din cale
				serverSAP: jQuery(location).attr('origin'), //"http://hvsrvsap3.rombat.local:8000",
				testMode: false,
				params : jQuery(location).attr('search'),
				notFromFiori: notFromFiori
			};
			
			
			if (oConfig.serverSAP.search('ondemand') !== -1) {
				oConfig.testMode = true;
			}			
			if (oConfig.serverSAP.search('rombat') === -1) {
				oConfig.serverSAP = "http://hvsrvsap3.rombat.local:8000";
			}

			oModel = new JSONModel(oConfig);

			//oModel.setDefaultBindingMode("OneWay");
			this.setModel(oModel, "config");

			oConfig = this.getMetadata().getConfig();
			var sNamespace = this.getMetadata().getManifestEntry("sap.app").id;

 

			//oModel = new JSONModel('./prod_lines.json');
			//this.setModel(oModel, "ProductionLineCollection");

			// create the views based on the url/hash
			this.getRouter().initialize();
		},

		//Functia care incarca date din SAP
		_loadResource: function(oDataModel,oParam, RequestCompleted) {

			var oConfig = this.getModel("config").getData();

			//var oOwner = this.getOwnerComponent();
			//var sNamespace = this.getMetadata().getManifestEntry("sap.app").id;

			// curent user	http://hvsrvsap3.rombat.local:8000/sap/bc/ui2/start_up
			var currentUser = this.getModel("currentUser").getData();

			//var url = oConfig.orderServer + "&resursa="+currentUser.user+"&pass="+currentUser.pass+"&detail=all";
			//var url = oConfig.orderServer + "&resursa="+currentUser.user+"&pass="+currentUser.pass+"&detail=all";
			var url = oConfig.serverSAP + "/sap/bc/zppmobi"+oConfig.params; //?detail=" + oResource;
			


			var parameters = {};
			if (oConfig.notFromFiori) {
			  parameters = {
					"sap-client": oConfig.clientSAP,
					"sap-user": currentUser.user,
					"sap-password": currentUser.pass,
					"sap-language": "RO"
				};
			}
			parameters = $.extend(parameters, oParam);
			var headers = {};
			oDataModel.attachRequestCompleted(RequestCompleted);
			oDataModel.loadData(url, parameters, true, "GET", false, false, headers);

		}

	});

});