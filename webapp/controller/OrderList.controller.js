sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"sap/ui/model/json/JSONModel",
	"sap/ui/pp/mobi/model/OrderListModel",
	"sap/ui/pp/mobi/model/formatter",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
	"sap/m/MessageToast",
	"sap/m/MessageBox",
	'sap/m/GroupHeaderListItem',
	"sap/ui/pp/mobi/model/barcode"
], function(Controller, JSONModel, OrderListModel, formatter, Filter, FilterOperator, MessageToast, MessageBox, GroupHeaderListItem,
	BarCodeScanner) {

	"use strict";

	return Controller.extend("sap.ui.pp.mobi.controller.OrderList", {

		formatter: formatter,

		onInit: function() {
			var oOrderModel = new JSONModel({});
			//var oOrderModel = this.getOwnerComponent().getModel("orderlist");
			this.getView().setModel(oOrderModel);

			//var oModel = this.getOwnerComponent().getModel("currentUser");
			//this.getView().setModel(oModel,'currentUser');
			//var oModelConfig = this.getView().getModel("config")

			var oRouter = sap.ui.core.UIComponent.getRouterFor(this);

			oRouter.getRoute("orderlist").attachPatternMatched(this.onObjectMatched, this);
			// de verificat daca este pornita apliocatia din SapFioriLanchpad

			// de verificat daca userul este logat si daca e logat seteaza parametrii

			MessageToast.show("Aplicatia PP Mobi a fost initializata");

			// incarcare linii de productie
			this.loadProductionLines();

		},

		loadProductionLines: function() {
			var oView = this.getView();
			var oOwner = this.getOwnerComponent();
			var oDataModel = new JSONModel();
			oOwner._loadResource(oDataModel, {
				'detail': 'prod_lines'
			}, function(oRequest) {
				oView.setBusy(false);
				var success = oRequest.getParameter("success");

				if (success) {
					oDataModel = oRequest.oSource;
					oOwner.setModel(oDataModel, "ProductionLineCollection");
				} else {

					MessageBox.error("Nu se poate accesa serverul de SAP");
				}
			});
		},

		loadOrders: function(oParam) {
			var self = this;
			var oView = this.getView();
			oView.setBusy(true);
			var oOwner = this.getOwnerComponent();
			//var oDataModel = new JSONModel();
			var oDataModel = new OrderListModel();
			oDataModel.oController = this;
			oDataModel.TestData = false;
			oOwner._loadResource(oDataModel, oParam, function(oRequest) {
				oView.setBusy(false);
				var success = oRequest.getParameter("success");
				var oAllDataModel = oRequest.oSource;
				if (success) {

					MessageToast.show("Date incarcate din SAP cu succes");

					oAllDataModel.refresh();

					var oAllData = oAllDataModel.getData();
					var oOrderData = {
						"ROOT": {
							"ORDERS": oAllData.ROOT.ORDERS
						}
					};
					var oStockData = {
						"ROOT": {
							"STOCK": oAllData.ROOT.STOCK
						}
					};

					//var oOrderModel = new JSONModel(oOrderData);
					var oOrderModel = new OrderListModel(oOrderData);
					oOrderModel.oController = self;
					oOrderModel.TestData = false;
					oOwner.setModel(oOrderModel, "orderlist");
					oView.setModel(oOrderModel);

					var oStockModel = new JSONModel(oStockData);
					oOwner.setModel(oStockModel, "StockCollection");

				} else {
					MessageBox.error("Nu se poate accesa serverul de SAP");
				}

			});
		},

		onChangeProductionLine: function(oEvent) {
			var oView = this.getView();
			var oItem = oEvent.getSource();
			var value = oItem.mProperties.selectedKey;
			this.loadOrders({
				'detail': 'line',
				'prod_line': value
			});
		},

		handleRefresh: function(oEvent) {

			var oItem = this.getView().byId("productionLine");
			var value = oItem.mProperties.selectedKey;
			this.loadOrders({
				'detail': 'line',
				'prod_line': value
			});

		},

		onObjectMatched: function(oEvent) {

			var self = this;
			BarCodeScanner.connect(function(barcode) {
				self.onScan(barcode);
			});
		},

		onScan: function(barcode) {
			MessageToast.show("Linia de productie: " + barcode);
			// build filter array
			var aFilter = [];
			aFilter.push(new Filter("HEADER/PRODUCTION_LINE", FilterOperator.Contains, barcode));
			// filter binding
			var oList = this.getView().byId("orderList");
			var oBinding = oList.getBinding("items");
			oBinding.filter(aFilter);
		},

		onFilterByOrder: function(oEvent) {
			// build filter array
			var aFilter = [];
			var sQuery = oEvent.getParameter("query");
			if (sQuery) {
				aFilter.push(new Filter("HEADER/PLANNEDORDER_NUM", FilterOperator.Contains, sQuery));
			}

			// filter binding
			var oList = this.getView().byId("orderList");
			var oBinding = oList.getBinding("items");
			oBinding.filter(aFilter);
		},

		onFilterByDate: function(oEvent) {
			// build filter array
			var aFilter = [];
			var sQuery = oEvent.getParameter("query");
			if (sQuery) {
				aFilter.push(new Filter("HEADER/ORDER_FIN_DATE", FilterOperator.EndsWith, sQuery));
			}

			// filter binding
			var oList = this.getView().byId("orderList");
			var oBinding = oList.getBinding("items");
			oBinding.filter(aFilter);
		},
		getGroupHeader: function(oGroup) {
			return new GroupHeaderListItem({
				title: 'Prioritate:' + oGroup.key,
				upperCase: false
			});
		},

		/**
		 * Event handler when a table item gets pressed
		 * @param {sap.ui.base.Event} oEvent the table selectionChange event
		 * @public
		 */
		onPressOrder: function(oEvent) {
			// The source is the list item that got pressed
			var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
			var oItem = oEvent.getSource();
			var oContext = oItem.getBindingContext();
			var orderPath = oContext.getPath();

			var oViewOrderDetail = this.getView("orderdetail");
			oViewOrderDetail.setBindingContext(oContext);

			var PathID = orderPath.replace("/ROOT/ORDERS/", "");

			oRouter.navTo("orderdetail", {
				id: PathID
			});
		},

		handleLocalDataTest: function(oEvent) {
			var self = this;
			var oOwner = this.getOwnerComponent();
			var oView = this.getView();
			var sNamespace = oOwner.getMetadata().getManifestEntry("sap.app").id;

			var oModelcurrentUser = oView.getModel("currentUser");

			var oConfig = oOwner.getMetadata().getConfig();

			//var oAllDataModel = new JSONModel(jQuery.sap.getModulePath(sNamespace, '/AllData.json'));
			var oAllDataModel = new OrderListModel(jQuery.sap.getModulePath(sNamespace, '/AllData.json'));
			oAllDataModel.oController = self;
			oAllDataModel.TestData = true;
			var oDataLines = new JSONModel(jQuery.sap.getModulePath(sNamespace, '/ProductionLine.json'));

			oOwner.setModel(oDataLines, "ProductionLineCollection");
			oView.setModel(oDataLines, "ProductionLineCollection");

			MessageToast.show("Date de TEST incarcate cu succes");

			oAllDataModel.attachRequestCompleted(function(oEvent) {

				var oAllData = oAllDataModel.getData();
				var oOrderData = {
					"ROOT": {
						"ORDERS": oAllData.ROOT.ORDERS
					}
				};
				var oStockData = {
					"ROOT": {
						"STOCK": oAllData.ROOT.STOCK
					}
				};

				//var oOrderModel = new JSONModel(oOrderData);
				var oOrderModel = new OrderListModel(oOrderData);
				oOwner.setModel(oOrderModel, "orderlist");
				oOrderModel.oController = self;
				oOrderModel.TestData = true;
				oView.setModel(oOrderModel);

				var oStockModel = new JSONModel(oStockData);
				oOwner.setModel(oStockModel, "StockCollection");
			});

		},

		handleLogout: function(oEvent) {
			var oView = this.getView();
			var oOwnerComponent = this.getOwnerComponent();
			MessageBox.confirm("Sunteti sigur?", fnCallbackConfirm);

			function fnCallbackConfirm(bResult) {
				if (bResult == 'OK') {
					var oOrderModel = new JSONModel({});

					oOwnerComponent.setModel(oOrderModel, "orderlist");
					oView.setModel(oOrderModel);

					oView.getModel("currentUser").getData().user = "";
					oView.getModel("currentUser").getData().pass = "";
					oView.getModel("currentUser").refresh();
					// trebuie trimis un request la adresa /sap/public/bc/icf/logoff

					var oConfig = oView.getModel("config").getData();

					jQuery.ajax({
						url: oConfig.serverSAP + "/sap/public/bc/icf/logoff",
						async: false
					}).complete(function() {
						location.reload();
					});
				}

			}

		},

		handlePressConfiguration: function(oEvent) {
			//var bundle = this.getView().getModel("i18n").getResourceBundle();

			var oModelConfig = this.getView().getModel("config");

			var that = this;

			var oConfigDialog = new sap.m.Dialog({
				title: "Configurare", //bundle.getText("BtnConfig"),
				type: sap.m.DialogType.Message,
				content: [new sap.m.Label({
						text: "Server "
					}), new sap.m.Input({
						value: '{/serverSAP}'
					}),
					new sap.m.Label({
						text: "Client "
					}), new sap.m.Input({
						value: '{/clientSAP}',
						maxLength: 3
					})
				],
				leftButton: new sap.m.Button({
					text: "OK",
					press: function() {
						oConfigDialog.close();
					}
				}),
				rightButton: new sap.m.Button({
					text: "Cancel",
					press: function() {
						oConfigDialog.close();
					}
				}),
				afterClose: function(evt) {
					var pressedButton = evt.getParameter("origin");
					if (pressedButton === this.getBeginButton()) {

						oModelConfig.getData().serverSAP = oConfigDialog.getModel().getData().serverSAP;
						oModelConfig.getData().clientSAP = oConfigDialog.getModel().getData().clientSAP;
						oModelConfig.refresh();

					}

					oConfigDialog.destroy();

				}
			});

			var oModel = new JSONModel(JSON.parse(oModelConfig.getJSON()));

			oConfigDialog.setModel(oModel);
			//  deschid dialog        
			oConfigDialog.open();
		},

		handlePressStart: function(oEvent) {
			var oButton = oEvent.getSource();

			// afisare buton LOGOUT daca am user logat
			var oModelConfig = this.getView().getModel("config");

			if (this.getView().getModel("currentUser").getData().user) {
				oModelConfig.oData.btnLogout = true;
			} else {
				oModelConfig.oData.btnLogout = false;
			}

			this.oActionSheet = sap.ui.xmlfragment("sap.ui.pp.mobi.view.ActionSheet", this);
			this.getView().addDependent(this.oActionSheet);

			this.oActionSheet.openBy(oButton);
		},

		handleAuthentification: function(oEvent) {

			//var bundle = this.getView().getModel("i18n").getResourceBundle();

			var oModelcurrentUser = this.getView().getModel("currentUser");

			var that = this;

			var oLogonDialog = new sap.m.Dialog({
				title: "Autentificare", //bundle.getText("BtnAuthen"),
				type: sap.m.DialogType.Message,
				content: [new sap.m.Label({
						text: "Username"
					}), new sap.m.Input({
						value: '{/user}'
					}),
					new sap.m.Label({
						text: "Password"
					}), new sap.m.Input({
						type: sap.m.InputType.Password,
						value: '{/pass}'
					})
				],
				leftButton: new sap.m.Button({
					text: "OK",
					press: function() {
						oLogonDialog.close();
					}
				}),
				rightButton: new sap.m.Button({
					text: "Cancel",
					press: function() {
						oLogonDialog.close();
					}
				}),
				afterClose: function(evt) {
					var pressedButton = evt.getParameter("origin");
					if (pressedButton === this.getBeginButton()) {
						if ((oLogonDialog.getModel().getData().user) && (oLogonDialog.getModel().getData().pass)) {
							oModelcurrentUser.getData().user = oLogonDialog.getModel().getData().user;
							oModelcurrentUser.getData().pass = oLogonDialog.getModel().getData().pass;
							oModelcurrentUser.refresh();
							that.loadProductionLines();

						} else {
							MessageBox.error("Introduceti utilizator / parola !", {
								icon: sap.m.MessageBox.Icon.ERROR,
								title: "Atentie!",
								onClose: null,
								styleClass: ""
							});
						}
					}

					oLogonDialog.destroy();
				}
			});

			// setez ultimul user care a folosit aplicatia
			var model = new sap.ui.model.json.JSONModel();
			model.setData({
				user: oModelcurrentUser.getData().user,
				pass: oModelcurrentUser.getData().pass
			});
			oLogonDialog.setModel(model);
			// deschid dialog
			oLogonDialog.open();
		}

	});

});