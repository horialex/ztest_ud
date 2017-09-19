var that;

/* global location */
sap.ui.define(["sap/ui/core/mvc/Controller",
		"sap/ui/model/json/JSONModel",
		"sap/ui/pp/mobi/model/OrderListModel",
		'sap/m/Button',
		'sap/m/Dialog',
		'sap/m/Text',
		"sap/ui/core/routing/History",
		"sap/ui/pp/mobi/model/formatter",
		"sap/ui/model/Filter",
		"sap/m/MessageToast",
		"sap/m/MessageBox",
		"sap/ui/pp/mobi/model/barcode"
	],

	function(Controller, JSONModel, OrderListModel, Button, Dialog, Text, History, formatter, Filter, MessageToast, MessageBox,
		BarCodeScanner) {

		"use strict";

		return Controller.extend("sap.ui.pp.mobi.controller.OrderDetail", {

			formatter: formatter,

			/* =========================================================== */
			/* lifecycle methods */
			/* =========================================================== */

			/**
			 * Called when the worklist controller is instantiated.
			 *
			 * @public
			 */
			onInit: function() {
				var oView = this.getView();

				var iOriginalBusyDelay, oViewModel = new JSONModel({
					busy: true,
					delay: 0
				});

				var oOrderModel = this.getOwnerComponent().getModel("orderlist");
				oView.setModel(oOrderModel);

				var oRouter = sap.ui.core.UIComponent.getRouterFor(this);

				oRouter.getRoute("orderdetail").attachPatternMatched(this.onObjectMatched, this);

				this.initOrderDetail();

			},

			initOrderDetail: function() {
				var oView = this.getView();
				var oOrderDetailModel = new JSONModel({
					'State': 'init',
					'txtYeldOrScrap': 'obtinuta',
					'IsYeld': true,
					'ForUpdate': false,
					'SetLot': false,
					'SetModForm': false,
					'e_doc': false,
					'messageSet': [{
						TYPE: 'I',
						MESSAGE: 'Momentan nu sunt erori'
					}]

				});
				oView.setModel(oOrderDetailModel, "orderdetail");
				return oOrderDetailModel;
			},

			onObjectMatched: function(oEvent) {
				var self = this;
				BarCodeScanner.connect(function(barcode) {
					self.onScan(barcode);
				});

				var oOwner = this.getOwnerComponent();

				var id = oEvent.getParameter("arguments").id;

				var oView = this.getView();

				var oOrderModel = this.getOwnerComponent().getModel("orderlist");
				oView.setModel(oOrderModel);
				var oData = oView.getModel().getData();

				var oOrderDetailModel = oView.getModel("orderdetail");
				if (!oOrderDetailModel) {
					oOrderDetailModel = this.initOrderDetail();
				}

				var oDataDetail = oOrderDetailModel.getData();

				if (typeof(oData.ROOT) == "undefined") {
					this.onNavBack(oEvent);
				}

				// un shortcut la comanda
				oData.Order = oData.ROOT.ORDERS[id];
				oData.MaterialIsEditable = false;
				oData.ScanMode = false;
				oData.compEdit = false;
				oData.rebutComp = false;
				oData.editYeld = true;
				oData.title = 'Confirmare productie comanda';

				oDataDetail.Order = oData.ROOT.ORDERS[id];
				oDataDetail.IsYeld = true;
				self.doSetColor(oDataDetail.IsYeld);

				oData.e_doc = oDataDetail.Order.HEADER.E_DOC == 'X';

				//oDataDetail.Order.HEADER.E_DOC = false; // dupa ce fac in sap o sa dezactivez

				var i;
				for (i in oData.Order.COMPONENTS) {
					if (typeof(oData.Order.COMPONENTS[i].split) === "undefined") {
						oData.Order.COMPONENTS[i].split = false;
					}
					if (typeof(oData.Order.COMPONENTS[i].BATCH) === "undefined") {
						oData.Order.COMPONENTS[i].BATCH = '';
					}
					if (oData.Order.COMPONENTS[i].BATCH != ''){
						oData.editYeld = false;	
					}
				}

				if (oData.Order.HEADER.YELD == 0) {
					oData.Order.HEADER.YELD = oData.Order.HEADER.TOTAL_PLORD_QTY;
					var i;
					for (i in oData.Order.COMPONENTS) {
						oData.Order.COMPONENTS[i].CONF_QUAN = oData.Order.COMPONENTS[i].REQ_QUAN;
						oData.Order.COMPONENTS[i].MAX_CONF_QUAN = oData.Order.COMPONENTS[i].REQ_QUAN;
					}
				}
				if (oData.Order.HEADER.POSTDATE == '0000-00-00') {
					oData.Order.HEADER.POSTDATE = new Date().toISOString().slice(0, 10);
				}

				var oDataLines = oView.getModel("ProductionLineCollection").getData();
				for (i in oDataLines.ROOT.LINES) {
					if (oDataLines.ROOT.LINES[i].ARBPL === oData.Order.HEADER.PRODUCTION_LINE) {
						if (oDataLines.ROOT.LINES[i].SET_PROD_LOT == '') {
							oDataDetail.SetLot = false;
						} else {
							oDataDetail.SetLot = true;
						}
						if (oDataLines.ROOT.LINES[i].SET_MOD_FORM == 'X') {
							oDataDetail.SetModForm = true;
						} else {
							oDataDetail.SetModForm = false;
						}
						if (oDataLines.ROOT.LINES[i].REBUT == 'X') {
							oDataDetail.EnableRebut = true;
						} else {
							oDataDetail.EnableRebut = false;
						}
						oDataDetail.super_user = oDataLines.ROOT.LINES[i].SUPER_USER;
					}
				}

				if (oData.Order.HEADER.LHMG1 < oData.Order.HEADER.TOTAL_PLORD_QTY) {
					oData.Order.HEADER.YELD = oData.Order.HEADER.LHMG1;
					this.doChangeYeld(oData.Order.HEADER.LHMG1);
				}

				oView.getModel().setData(oData);
				oOrderDetailModel.setData(oDataDetail);
				oView.setModel(oOrderDetailModel, "orderdetail");
				jQuery.sap.require("sap.ui.model.Context");
				var newContext = new sap.ui.model.Context(oView.getModel(), "/ROOT/ORDERS/" + id);
				oView.setBindingContext(newContext);

			},

			onScan: function(barcode) {
				MessageToast.show("Lot scanat: " + barcode);
				var oView = this.getView();
				var oData = oView.getModel().getData();
				var oChargs = this.getView().getModel("StockCollection").getData();
				oChargs = oChargs.ROOT.STOCK;
				var i;
				var gasit = false;
				var comp;
				var lot;
				for (i in oChargs) {
					lot = oChargs[i];
					if (lot.CHARG == barcode) {
						gasit = true;
						break;
					}
				}
				if (gasit == false) {
					MessageBox.error("Componenta  " + barcode + " scanata nu exista");
					return;
				}

				gasit = false;
				for (i in oData.Order.COMPONENTS) {
					comp = oData.Order.COMPONENTS[i];
					if (lot.CHARG == comp.BATCH) {
						gasit = true;
						break;
					}
				}

				if (gasit == true) {
					MessageToast.show("Lotul  " + lot.CHARG + ' a fost utilizat');
					return;
				}

				gasit = false;
				for (i in oData.Order.COMPONENTS) {
					comp = oData.Order.COMPONENTS[i];
					if (comp.MATERIAL === lot.MATERIAL && comp.BATCH === '') {
						gasit = true;
						break;
					}
				}
				if (gasit === false) {
					MessageBox.error("Materialul " + lot.MATL_DESC + ' nu se gaseste in lista de componente');
					return;
				}

				comp.BATCH = lot.CHARG;
				if (comp.CONF_QUAN > lot.QTY) {
					comp.CONF_QUAN = lot.QTY;
					comp.split = true;
					this.doSplitItem(comp);
				}

				oView.getModel().setData(oData);
				var oComponentsList = oView.byId("componentsList");
				oComponentsList.getModel().refresh(); // asta nu are efect

			},

			onPressTest: function(oEvent) {
				this.onScan('0003');
			},

			/* =========================================================== */
			/* event handlers */
			/* =========================================================== */

			/**
			 * Event handler for navigating back. It checks if there is a history
			 * entry. If yes, history.go(-1) will happen. If not, it will replace
			 * the current entry of the browser history with the worklist route.
			 *
			 * @public
			 */
			onNavBack: function(oEvent) {
				var oHistory = History.getInstance();
				var sPreviousHash = oHistory.getPreviousHash();
				var oView = this.getView();
				var oModelOrder = oView.getModel("orderlist");
				var sNamespace = this.getOwnerComponent().getMetadata().getManifestEntry("sap.app").id;
				localStorage.setItem(sNamespace + '.orders', oModelOrder.getJSON());

				BarCodeScanner.disconnect();
				if (oEvent.sId !== "navButtonPress") {
					oModelOrder.oController.handleRefresh();
					//oController = this.getView().getController();
					//oController.loadOrders();
					//if (oModelOrder.TestData) {
					//  oModelOrder.oController.handleLocalDataTest();
					//} else {
					//  oModelOrder.oController.loadOrders({'detail':'line','prod_line':value});
					//}
				}

				if (sPreviousHash !== undefined) {
					// The history contains a previous entry
					history.go(-1);
				} else {
					// Otherwise we go backwards with a forward
					// history
					var bReplace = true;
					var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
					var oViewOrderDetail = this.getView('orderlist');
					BarCodeScanner.connect(function(barcode) {
						oViewOrderDetail.onScan(barcode);
					});
					oRouter.navTo("orderlist", {}, bReplace);
				}
			},

			messagePopoverOpen: function(oEvent) {
				var oView = this.getView();
				var oData = oView.getModel().getData();

				jQuery.sap.require("sap.m.MessagePopover");
				jQuery.sap.require("sap.m.MessagePopoverItem");

				var oMessageTemplate = new sap.m.MessagePopoverItem({
					type: {
						path: 'TYPE',
						formatter: this.formatter.formatMessageType
					},
					title: {
						path: 'TYPE',
						formatter: this.formatter.formatMessageTitle
					},
					description: "{MESSAGE}"

				});

				var oMessagePopover1 = new sap.m.MessagePopover({
					items: {
						path: '/',
						template: oMessageTemplate
					}
				});

				var oModel = new JSONModel();
				oModel.setData(oData.Order.messageSet);

				oMessagePopover1.setModel(oModel);

				oMessagePopover1.openBy(oEvent.getSource());

				/*
				this.oMessagePopover = sap.ui.xmlfragment( "sap.ui.pp.mobi.view.SAPResult", this);
				oView.addDependent(this.oMessagePopove);


				var oContext = oView.getBindingContext();
				this.oMessagePopover.setBindingContext(oContext);

				this.oMessagePopover.openBy(oEvent.getSource());
				 */
			},

			handleShowJSON: function(oEvent) {
				var oView = this.getView();
				var oModel = this.getView().getModel("orderlist");
				oView.byId("myJSON").setProperty('value', "" + oModel.getJSON());
			},

			onPressSave: function(oEvent) {
				this.doSave(false);
			},

			onPressSavePrint: function(oEvent) {
				this.doSave(true);
			},

			doSave: function(oPrint){
				var that = this;
				var oView = this.getView();
				var LotOK = this.doCheckBatch();
				var oData = oView.getModel().getData();
				var oOrderDetailModel = oView.getModel("orderdetail");
				var oDataDetail = oOrderDetailModel.getData();
				
				
				if (oDataDetail.IsYeld && ( oData.Order.HEADER.YELD == 0 || oData.Order.HEADER.YELD == '') )	{
						return MessageBox.error("Va rog sa introduceti cantitatea produsa!");	
				}
				if (!LotOK) {
					var userID = '';
					if (sap.ushell) {
						userID = sap.ushell.Container.getService("UserInfo").getId();
					}
					if (userID != oDataDetail.super_user) {
						return MessageBox.error("Sunt componente care nu au lotul specificat!");
					}
				}

				var mesaj = "Salvati confirmarea comenzii?";
				if (!LotOK) {
					mesaj = mesaj + "       ATENTIE! Sunt componente care nu au lotul specificat! ";
				}
				oView.setBusy(true);
				MessageBox.confirm(mesaj,
					function(bResult) {
						if (bResult == 'OK') {
							var oData = oView.getModel().getData();
							that.doConfirmOrder(oData, oPrint);
						} else {
							oView.setBusy(false);
						}
					}

				);				
			},

			onChangeRepPoint: function(oEvent) {
				// Trebuie sa recalculez cantitatea de YELD
				var oView = this.getView();
				var oComponentsList = oView.byId("componentsList");
				var oItem = oEvent.getSource();
				var value = oItem.mProperties.selectedKey;
				var oBinding;
				if (value !== "") {
					var oFilter = new Filter("ACTIVITY", sap.ui.model.FilterOperator.EQ, value);

					oBinding = oComponentsList.getBinding("items");
					oBinding.filter(oFilter);
				} else {
					oBinding = oComponentsList.getBinding("items");
					oBinding.filter();
				}
				// trebuie sa actualizeaz lista de componente
			},

			handleAddItem: function(oEvent) {
				var oView = this.getView();
				var oData = oView.getModel().getData();

				var oComponentsList = oView.byId("componentsList");

				oComponentsList.setBusy(true);

				oData.Order.ForUpdate = true;
				oData.Order.COMPONENTS.push({
					'MATERIAL': '',
					'MATL_DESC': ''
				});

				oView.byId("dummy").setProperty('value', "" + oData.Order.COMPONENTS.length);

				oView.getModel().setData(oData);
				oComponentsList.getModel().refresh(); // asta nu are efect

				oComponentsList.setBusy(false);

			},

			doSplitItem: function(value) {
				var oView = this.getView();
				var oData = oView.getModel().getData();
				var rap = oData.Order.HEADER.YELD / oData.Order.HEADER.TOTAL_PLORD_QTY;
				var CONF_QUAN = rap * value.REQ_QUAN;
				oData.Order.ForUpdate = true;
				if (value.CONF_QUAN > 0 && CONF_QUAN > value.CONF_QUAN && CONF_QUAN > 0) {
					// se face o copie
					value.split = false;

					var NewValue = $.extend(true, {}, value);

					var newREQ_QUAN = (value.REQ_QUAN * value.CONF_QUAN) / CONF_QUAN;

					NewValue.REQ_QUAN = value.REQ_QUAN - newREQ_QUAN;
					value.REQ_QUAN = newREQ_QUAN;

					NewValue.CONF_QUAN = rap * NewValue.REQ_QUAN;
					NewValue.BATCH = '';

					var index = 0;
					var com;
					for (com in oData.Order.COMPONENTS) {
						if (value.MATERIAL === oData.Order.COMPONENTS[com].MATERIAL) {
							index = com;
						}
					}
					//oData.Order.COMPONENTS.push( new_value )
					oData.Order.COMPONENTS.splice(index + 1, 0, NewValue);

				}

			},

			handleChangeDate: function(oEvent) {

				var oDP = oEvent.oSource;
				var sValue = oEvent.getParameter("value");

			},

			handleReplaceItem: function(oEvent) {
				var oView = this.getView();
				var oData = oView.getModel().getData();
				var oComponentsList = oView.byId("componentsList");
				var oItem = oEvent.getSource();
				var oContext = oItem.getBindingContext();
				var value = oContext.getProperty();
				var oModel = new JSONModel(value);
				var oReplaceItemDialog = new sap.m.Dialog({
					title: "Inlocuire componenta", //bundle.getText("BtnConfig"),
					type: sap.m.DialogType.Message,
					content: [
						new sap.m.Label({
							text: "Material"
						}),
						new sap.m.Input({
							value: '{/MATERIAL}'
						})
					],
					leftButton: new sap.m.Button({
						text: "OK",
						press: function() {
							oReplaceItemDialog.close();
						}
					}),
					rightButton: new sap.m.Button({
						text: "Cancel",
						press: function() {
							oReplaceItemDialog.close();
						}
					}),

					afterClose: function(evt) {
						var pressedButton = evt.getParameter("origin");
						if (pressedButton === this.getBeginButton()) {
							oReplaceItemDialog.getData().MATERIAL = oReplaceItemDialog.getModel().getData().MATERIAL;
							oReplaceItemDialog.refresh();

							oItem.setBindingContext(oContext);

							oComponentsList.getModel().refresh();
							oComponentsList.setBusy(false);

						}
						oReplaceItemDialog.destroy();
					}
				});

				oReplaceItemDialog.setModel(oModel);
				//  deschid dialog
				oReplaceItemDialog.open();

			},

			onPressSplitItem: function(oEvent) {
				var oView = this.getView();
				var oData = oView.getModel().getData();
				var oItem = oEvent.getSource();
				var oContext = oItem.getBindingContext();

				var value = oContext.getProperty();

				var oComponentsList = oView.byId("componentsList");

				oComponentsList.setBusy(true);
				this.doSplitItem(value);
				oItem.setBindingContext(oContext);
				oView.getModel().setData(oData);
				oComponentsList.getModel().refresh(); // asta nu are efect
				oComponentsList.setBusy(false);
			},

			onPressEditMaterial: function(oEvent) {
				var oView = this.getView();
				var oData = oView.getModel().getData();

				var is_pressed = oEvent.getSource().getPressed();

				oData.MaterialIsEditable = is_pressed;
				oView.getModel().setData(oData);

			},

			onPressScann: function(oEvent) {
				//  this.onNavBack(oEvent);
				var oView = this.getView();
				var oData = oView.getModel().getData();
				oData.ScanMode = !oData.ScanMode;
				oData.compEdit = oData.ScanMode;
				oView.getModel().setData(oData);
			},

			onError: function(msg) {
				var msg = 'Error' + msg;
				MessageToast.show(msg);
			},

			onPressCreateLot: function(oEvent) {
				var that = this;
				var oView = this.getView();
				var oData = oView.getModel().getData();
				if (oData.Order.HEADER.BATCH != '') {
					MessageBox.confirm("Generati un lot nou?",
						function(bResult) {
							if (bResult == 'OK') {
								that.doLotNou(oData);
								oView.getModel().setData(oData);
							}
						}
					);
				} else {
					that.doLotNou(oData);
					oView.getModel().setData(oData);

				}

			},

			doLotNou: function(oData) {
				oData.Order.HEADER.BATCH = "LOT_NOU";
				var char;
				for (char in oData.Order.CHARS) {
					oData.Order.CHARS[char].VALUE = '';
				}
			},

			handleChangeYeld: function(oEvent) {
				var newValue = oEvent.getParameter("value");
				this.doChangeYeld(newValue);

			},

			onPressClearQty: function(oEvent) {
				var oView = this.getView();
				var oData = oView.getModel().getData();
				oData.Order.HEADER.YELD = '';
				this.doChangeYeld(0);
				oView.getModel().setData(oData);
			},

			doCheckBatch: function() {
				var oView = this.getView();
				var oData = oView.getModel().getData();
				var LotOK = true;
				for (var comp in oData.Order.COMPONENTS) {
					// se recalculeaza cantitatea doar la produele la care nu a fost scanat un lot
					if (oData.Order.COMPONENTS[comp].BATCH === '' && oData.Order.COMPONENTS[comp].CONF_QUAN > 0) {
						LotOK = false;
					}
				}
				return LotOK;
			},

			doChangeYeld: function(newValue) {
				var oView = this.getView();
				var oData = oView.getModel().getData();
				var rap = newValue / oData.Order.HEADER.TOTAL_PLORD_QTY;
				var decimals;
				var comp;
				var qty;
				for (comp in oData.Order.COMPONENTS) {
					// se recalculeaza cantitatea doar la produele la care nu a fost scanat un lot
					if (oData.Order.COMPONENTS[comp].BATCH === '') {
						qty = rap * oData.Order.COMPONENTS[comp].REQ_QUAN;
						if (oData.Order.COMPONENTS[comp].UOM === 'ST') {
							decimals = 0;
						} else {
							decimals = 2;
						}
						oData.Order.COMPONENTS[comp].CONF_QUAN = Number(Math.round(qty + 'e' + decimals) + 'e-' + decimals);
					}
				}
				oView.getModel().setData(oData);
			},

			doConfirmOrder: function(oData, vPrint) {

				var self = this;
				var oView = this.getView(),
					//currentUser = oView.getModel("currentUser").getData(),
					oModelControls = oView.getModel("controls");
				oView.setBusy(true);
				// salvare date in SAP
				var oConfig = oView.getModel("config").getData();
				var oDataDetail = oView.getModel("orderdetail").getData();

				if (oDataDetail.IsYeld) {
					oData.Order.HEADER.BACKFLQUANT = oData.Order.HEADER.YELD;
					oData.Order.HEADER.ISYELD = 'X';
				} else {
					oData.Order.HEADER.SCRAPQUANT = oData.Order.HEADER.YELD;
					oData.Order.HEADER.ISYELD = '';
				}
				if (vPrint) {
					oData.Order.HEADER.DOPRINT = 'X';
				}

				// todo: de pus calea intr-o constanta
				var url = oConfig.serverSAP + "/sap/bc/zppmobi?detail=confirm";
				var oUpdateModel = new JSONModel();

				oUpdateModel.attachRequestCompleted(function(oEvent) {
					oView.setBusy(false);
					var success = oEvent.getParameter("success");
					if (success) {
						var oDataSAP = oUpdateModel.getData();
						if (oDataSAP.ROOT.RETURN.TYPE === "E") {
							MessageBox.error("Comanda nu a fost confirmata. Error:" + oDataSAP.ROOT.RETURN.MESSAGE);
						} else {
							MessageToast.show("Comanda a fost confirmata.");
						}
						self.onNavBack(oEvent);
					} else {
						MessageBox.error("Nu se poate face confirmarea. Eroare de comunicare");
					}

				});

				var currentUser = this.getView().getModel("currentUser").getData();

				var oParameters = {};

				if (oConfig.notFromFiori) {
					oParameters = {
						"sap-client": oConfig.clientSAP,
						"sap-user": currentUser.user,
						"sap-password": currentUser.pass,
						"sap-language": "RO",
						"detail": "confirm",
						"ORDER": JSON.stringify(oData.Order)
					};
				} else {
					oParameters = {
						"ORDER": JSON.stringify(oData.Order),
						"detail": "confirm"
					};

				}

				oUpdateModel.loadData(url, oParameters, true, 'POST');

			},

			handleChangeConfQty: function(oEvent) {
				var newValue = oEvent.getParameter("value");
				var oView = this.getView();
				var oData = oView.getModel().getData();
				var oItem = oEvent.getSource();
				var oContext = oItem.getBindingContext();

				var value = oContext.getProperty();

				var rap = oData.Order.HEADER.YELD / oData.Order.HEADER.TOTAL_PLORD_QTY;
				var CONF_QUAN = rap * value.REQ_QUAN;

				value.split = (newValue < CONF_QUAN);

				oItem.setBindingContext(oContext);
			},

			handleRebutComop: function(oEvent) {
				var oView = this.getView();
				var oData = oView.getModel().getData();

				var oDataDetail = oView.getModel("orderdetail").getData();

				oData.rebutComp = !oData.rebutComp;
				if (oData.rebutComp) {
					oDataDetail.Order.HEADER.YELD = 0; //elimin cantitatea planificata	
					this.doChangeYeld(0);
					oData.compEdit = true;
					oData.editYeld = false;
				} else {
					oData.compEdit = false;
					oData.editYeld = true;

				}
				this.doSetColor(false, oData.compEdit);
				oView.getModel("orderdetail").setData(oDataDetail);
				oView.getModel().setData(oData);
			},

			handleChangeSwitch: function(oEvent) {
				var oView = this.getView();
				var oData = oView.getModel().getData();

				var oDataDetail = oView.getModel("orderdetail").getData();
				var state = oEvent.getParameter("state");

				var self = this;

				if (oDataDetail.IsYeld) {
					MessageBox.confirm('Treceti in modul de confirmare REBUT?',
						function(bResult) {
							if (bResult == 'OK') {
								oDataDetail.IsYeld = false;
								oDataDetail.txtYeldOrScrap = "rebutata";
								oData.title = 'Confirmare R E B U T';
								oDataDetail.Order.HEADER.YELD = 0; //elimin cantitatea planificata
								self.doChangeYeld(0);
								oDataDetail.compEdit = false;
								self.doSetColor(oDataDetail.IsYeld);
								oView.getModel("orderdetail").setData(oDataDetail);
								oView.getModel().setData(oData);
							}
						}
					);
				} else {
					oDataDetail.IsYeld = true;
					oData.Order.HEADER.YELD = oData.Order.HEADER.TOTAL_PLORD_QTY;
					oDataDetail.rebutComp = false;                         
					oDataDetail.txtYeldOrScrap = "obtinuta";
					oData.title = 'Confirmare productie';
					self.doSetColor(oDataDetail.IsYeld);
					oView.getModel("orderdetail").setData(oDataDetail);
					oView.getModel().setData(oData);
					self.doChangeYeld(oData.Order.HEADER.YELD);
				}

				//var oBundle = oView.getModel("i18n").getResourceBundle();

			},

			doSetColor: function(IsYeld, EditCom) {
				EditCom = EditCom || false;
				var oView = this.getView();
				var oPageOrderDetail = oView.byId("pageOrderDetail");
				var olabelYeld = oView.byId("labelYeld");
				var oFieldGroupView = oView.byId("FieldGroupView");
				if (IsYeld) {
					//$('#' + olabelYeld.sId).css("color", "Green");
					$('#' + oFieldGroupView.sId).removeClass("sapScrap");
					$('#' + oFieldGroupView.sId).removeClass("sapScrapComp");
					$('#' + oFieldGroupView.sId).addClass("sapConf");
					//$('#__component0---orderdetail--pageOrderDetail-title-inner').css("color", "Green");	
					$('#__component0---orderdetail--pageOrderDetail-title-inner').removeClass("sapRed");
				} else {
					//$('#' + olabelYeld.sId).css("color", "Red");
					$('#' + oFieldGroupView.sId).removeClass("sapConf");
					if (EditCom) {
						$('#' + oFieldGroupView.sId).addClass("sapScrapComp");
						$('#' + oFieldGroupView.sId).removeClass("sapScrap");
					} else {
						$('#' + oFieldGroupView.sId).addClass("sapScrap");
						$('#' + oFieldGroupView.sId).removeClass("sapScrapComp");
					}

					//$('#__component0---orderdetail--pageOrderDetail-title-inner').css("color", "Red");
					$('#__component0---orderdetail--pageOrderDetail-title-inner').addClass("sapRed");

				}
			},

			handleValueRequestCharVal: function(oController) {
				var oView = this.getView();
				var oOwner = this.getOwnerComponent();
				this.inputId = oController.oSource.sId;
				var oItem = oController.getSource();
				var oContext = oItem.getBindingContext();
				var value = oContext.getProperty();
				this.value = value;
				this.BATCH_CLASS = value.BATCH_CLASS;
				var oCharValModel = new JSONModel(value.VALUES);
				oOwner.setModel(oCharValModel, "CharValCollection");

				if (!this._valueHelpDialogCharVal) {
					this._valueHelpDialogCharVal = sap.ui.xmlfragment(
						"sap.ui.pp.mobi.view.SHDialogCHARVAL",
						this
					);
					this.getView().addDependent(this._valueHelpDialogCharVal);

				}
				// open value help dialog
				this._valueHelpDialogCharVal.open();
			},

			handleShowDoc: function() {
				var oView = this.getView();
				var oOwner = this.getOwnerComponent();
				var oDataDetail = oView.getModel("orderdetail").getData();
				var oDocsModel = new JSONModel(oDataDetail.Order.DOCS);
				oOwner.setModel(oDocsModel, "DocsCollection");
				if (!this._valueDialogDocs) {
					this._valueDialogDocs = sap.ui.xmlfragment(
						"sap.ui.pp.mobi.view.DialogDocs",
						this
					);
					this.getView().addDependent(this._valueDialogDocs);
					this._valueDialogDocs.setModel(oDocsModel, "DocsCollection");
				}
				this._valueDialogDocs.open();
			},

			handleDocSelect: function(oEvent) {
				var oSelectedItem = oEvent.getParameter("selectedItem");
				var oView = this.getView();
				var oConfig = oView.getModel("config").getData();
				if (oSelectedItem) {
					var aContexts = oEvent.getParameter("selectedContexts");
					if (aContexts && aContexts.length) {
						var oContextDoc = aContexts[0];
						var valueDoc = oContextDoc.getProperty();
						var url = oConfig.serverSAP + "/sap/bc/zppmobi?detail=doc&doc_id=" + valueDoc.ATTA_ID;
						window.open(url);
					}
				}
			},

			handleValueRequestCharg: function(oController) {
				this.inputId = oController.oSource.sId;
				// create value help dialog

				var oItem = oController.getSource();
				var oContext = oItem.getBindingContext();
				var value = oContext.getProperty();
				this.value = value;
				this.MATERIAL = value.MATERIAL;

				if (!this._valueHelpDialogCHARG) {
					this._valueHelpDialogCHARG = sap.ui.xmlfragment(
						"sap.ui.pp.mobi.view.SHDialogCHARG",
						this
					);
					this.getView().addDependent(this._valueHelpDialogCHARG);

				}
				var oFilter = new Filter("MATERIAL", sap.ui.model.FilterOperator.EQ, value.MATERIAL);
				// de adaugat si filtrui prin care sa nu se permita filtrul pe materialul actual
				var oItems = this._valueHelpDialogCHARG.getBinding("items");
				if (oItems) {
					oItems.filter([oFilter]);
				}

				// open value help dialog
				this._valueHelpDialogCHARG.open();
			},

			_handleValueHelpSearchCharg: function(oEvent) {
				var sValue = oEvent.getParameter("value");
				var oFilterMATERIAL = new Filter("MATERIAL", sap.ui.model.FilterOperator.Contains, this.MATERIAL);
				var oFilterCHARG = new Filter("CHARG", sap.ui.model.FilterOperator.Contains, sValue);
				oEvent.getSource().getBinding("items").filter([oFilterMATERIAL, oFilterCHARG]);
			},

			_handleValueHelpCloseCharg: function(oEvent) {
				var oSelectedItem = oEvent.getParameter("selectedItem");

				if (oSelectedItem) {
					var aContexts = oEvent.getParameter("selectedContexts");
					if (aContexts && aContexts.length) {
						var oContextCharg = aContexts[0];
						var valueCharg = oContextCharg.getProperty();
					}
					
					var oView = this.getView();
					var oData = oView.getModel().getData();
					var comp;
					var gasit = false;
					for (var i in oData.Order.COMPONENTS) {
						comp = oData.Order.COMPONENTS[i];
						if (valueCharg.CHARG == comp.BATCH && valueCharg.MATERIAL == comp.MATERIAL) {
							gasit = true;
							break;
						}
					}
					if (gasit == true) {
						MessageToast.show("Lotul  " + valueCharg.CHARG + ' a fost utilizat');
						return;
					}
					oData.editYeld = false; // daca am selectat un lot nu mai am voie sa modific cantitatea
					
					var productInput = this.getView().byId(this.inputId);
					productInput.setValue(oSelectedItem.getTitle());

					//  var oContext = productInput.getBindingContext();
					//  var value = oContext.getProperty();

					//  value.BATCH = oSelectedItem.getTitle();
					var value = this.value;
					if (valueCharg.QTY < value.CONF_QUAN) {
						value.CONF_QUAN = valueCharg.QTY;
						//value.split = true;
						this.doSplitItem(value);
					}

					//  productInput.setBindingContext(oContext);

				}
				oEvent.getSource().getBinding("items").filter([]);
			},

			handleValueRequestMatnr: function(oController) {
				this.inputId = oController.oSource.sId;
				// create value help dialog

				if (!this._valueHelpDialogMATNR) {
					this._valueHelpDialogMATNR = sap.ui.xmlfragment(
						"sap.ui.pp.mobi.view.SHDialogMATNR",
						this
					);
					this.getView().addDependent(this._valueHelpDialogMATNR);
					//var oMaterialsModel = this.getOwnerComponent().getModel("MaterialsCollection");
					//this._valueHelpDialog.setModel(oMaterialsModel,"MaterialsCollection");
				}

				// open value help dialog
				this._valueHelpDialogMATNR.open();
			},

			_handleValueHelpSearch: function(evt) {
				var sValue = evt.getParameter("value");
				var oFilter = new Filter(
					"Name",
					sap.ui.model.FilterOperator.Contains, sValue
				);
				evt.getSource().getBinding("items").filter([oFilter]);
			},

			_handleValueHelpClose: function(oEvent) {
				var oSelectedItem = oEvent.getParameter("selectedItem");
				if (oSelectedItem) {
					var fieldInput = this.getView().byId(this.inputId);
					fieldInput.setValue(oSelectedItem.getTitle());
					fieldInput.setDescription(oSelectedItem.getDescription());
				}
				oEvent.getSource().getBinding("items").filter([]);
			}

		});

	});