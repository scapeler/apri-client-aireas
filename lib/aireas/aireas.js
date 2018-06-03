/*jslint devel: true,  undef: true, newcap: true, white: true, maxerr: 50 */
/*global APRI*/
/**
 * @module aireas
 */

"use strict"; // This is for your code to comply with the ECMAScript 5 standard.

// ApriAppAir class def ===============================================================================
// parent: class ApriAppBase
var ApriAppAir = ApriApps.ApriAppAir = ApriApps.ApriAppAir || ApriApps.ApriAppBase.extend(function () {

	//initializer is executed before the constructor.
    this.initializer = function() {
        //...
		var bodyElement = document.getElementsByTagName('body')[0];

					//	if (window.outerWidth != undefined) {
			//		bodyElement.style.height 	= window.outerHeight + 'px';
       		// 		bodyElement.style.width 	= window.outerWidth + 'px';
			//	} else {
					bodyElement.style.height 	= window.innerHeight + 'px';
       		 		bodyElement.style.width 	= window.innerWidth + 'px';
			//	}
				bodyElement.setAttribute('height', bodyElement.style.height);
				bodyElement.setAttribute('width', bodyElement.style.width);
    };

	var apriCookieBase;
	var apriTree;   // for layers menu and more
	var tickEventActive;

	var appConfig = {
		viewZoomLevel: 9,
		mapCenterLat: 51.45401,
		mapCenterLng: 5.47668
//		viewCoordinates: [51.45401, 5.47668],
	}

	var apriConfig, apriClientInfo;
	//var appBodyContainer;
	var templates;

	var maxAreas = 5;

	var aireasAvgType = 'OZON'; // 'UFP', 'PM1', 'PM25', 'PM10', 'SPMI', 'OZON', 'NO2', 'CELC', 'HUM', 'AMBHUM', 'AMBTEMP'

	var movieLayers = {};
	var markers={};

	var RDres = [3440.640, 1720.320, 860.160, 430.080, 215.040, 107.520, 53.760, 26.880, 13.440, 6.720, 3.360, 1.680, 0.840, 0.420];
/*		var RDcrs = new L.Proj.CRS('EPSG:28992',
              '+proj=sterea +lat_0=52.15616055555555 +lon_0=5.38763888888889 +k=0.9999079 +x_0=155000 +y_0=463000 +ellps=bessel +units=m +towgs84=565.2369,50.0087,465.658,-0.406857330322398,0.350732676542563,-1.8703473836068,4.0812 +no_defs <>',
            {
                transformation: new L.Transformation(1, 285401.920, -1, 903401.920),
			//	origin: [218128.7031, 6126002.9379],
                resolutions: RDres
            });
*/
	var RDcrs = L.CRS.proj4js('EPSG:28992', '+proj=sterea +lat_0=52.15616055555555 +lon_0=5.38763888888889 +k=0.9999079 +x_0=155000 +y_0=463000 +ellps=bessel +units=m +towgs84=565.2369,50.0087,465.658,-0.406857330322398,0.350732676542563,-1.8703473836068,4.0812 +no_defs', new L.Transformation(1, 285401.920, -1, 903401.920));
	RDcrs.scale = function(zoom) {
   		return 1 / res[zoom];
	};
   	RDcrs.scale = function (zoom) {
       	return 1 / RDres[zoom];
   	};



//////////////////

L.TileLayer.BetterWMS = L.TileLayer.WMS.extend({

  onAdd: function (map) {
    // Triggered when the layer is added to a map.
    //   Register a click listener, then do all the upstream WMS things
    L.TileLayer.WMS.prototype.onAdd.call(this, map);
    map.on('click', this.getFeatureInfo, this);
  },

  onRemove: function (map) {
    // Triggered when the layer is removed from a map.
    //   Unregister a click listener, then do all the upstream WMS things
    L.TileLayer.WMS.prototype.onRemove.call(this, map);
    map.off('click', this.getFeatureInfo, this);
  },

  getFeatureInfo: function (evt) {
    // Make an AJAX request to the server and hope for the best
	var context = evt;
    var url = this.getFeatureInfoUrl(evt.latlng),
        showResults = L.Util.bind(this.showGetFeatureInfo, this);
	var apriAjaxBase = new ApriCore.ApriAjaxBase();
	var params = {};
	var options = {};
	var callback = function(data, contextCB, error) {
		var err = typeof data === 'string' ? null : data;
		showResults(err, contextCB.latlng, data)
		};
	apriAjaxBase.request(url, params, options, callback, context );
  },

  getFeatureInfoUrl: function (latlng) {
    // Construct a GetFeatureInfo request URL given a point
    var point = this._map.latLngToContainerPoint(latlng, this._map.getZoom()),
        size = this._map.getSize(),

        params = {
          request: 'GetFeatureInfo',
          service: 'WMS',
          srs: 'EPSG:4326',
//          srs: 'EPSG:28992',
          styles: this.wmsParams.styles,
          transparent: this.wmsParams.transparent,
          version: this.wmsParams.version,
          format: this.wmsParams.format,
          bbox: this._map.getBounds().toBBoxString(),
          height: size.y,
          width: size.x,
          layers: this.wmsParams.layers,
          query_layers: this.wmsParams.layers,
          //info_format: 'text/html'
          info_format: 'application/json'
        };

    params[params.version === '1.3.0' ? 'i' : 'x'] = point.x;
    params[params.version === '1.3.0' ? 'j' : 'y'] = point.y;

    return this._url + L.Util.getParamString(params, this._url, true);
  },

  showGetFeatureInfo: function (data, latlng, content) {
    if (data == null) {  // html result from geoserver


		var popUp = L.popup({ maxWidth: 800})
      		.setLatLng(latlng)
      		.setContent(content)
      		.openOn(this._map);

		return;
	};



    if (data && data.type=="FeatureCollection" && data.features.length>0 ) {
	    // Otherwise show the content in a popup, or something.
		var popupView 			= this.options.popupView;
		var popupViewTemplate 	= Handlebars.compile(popupView);

		var _record = data.features[0];
		var tmpDate = new Date(_record.properties.retrieveddate);
		_record.properties.retrievedDateFormatted = moment(tmpDate).format('YYYY/MM/DD');     //tmpDate.format('yyyy-m-d');
		_record.properties.retrievedTimeFormatted = moment(tmpDate).format('HH:mm');   //tmpDate.format('HH:MM');

		var _airbox 		= _record.properties.airbox;
		var _locationName 	= _record.properties.airbox_location + ' ' + _record.properties.airbox_postcode;
		var _locationType 	= _record.properties.airbox_location_type ;
		var _locationDesc 	= _record.properties.airbox_location_desc ;
		var _locationX		= _record.properties.airbox_x ;
		var _locationY		= _record.properties.airbox_y ;


//		if (Addresses[_airbox]) {
//			var _voorv = Addresses[_airbox].voorv?Addresses[_airbox].voorv+' ':'';
//			_locationName = _voorv + Addresses[_airbox].adres + ' ' + Addresses[_airbox].pcw;
//		}

		_record.properties.locationName = _locationName;
		_record.properties.locationCode = _record.properties.airbox;
		var _content = popupViewTemplate({
			data: _record.properties
		});

    	var popUp = L.popup({ maxWidth: 800, closeButton: false })
      		.setLatLng(latlng)
      		.setContent(_content)
      		.openOn(this._map)
			;

		var closeButton = popUp._container.getElementsByClassName('fa fa-times-circle')[0];
		closeButton.addEventListener("click", function(){
    		map.closePopup();
		});
		var chartContainer 	= popUp._container.getElementsByClassName('chart-wrapper')[0];
		var chartButton 	= popUp._container.getElementsByClassName('measurepoint-wrapper cta')[0];
		chartButton.addEventListener("click", function(){
			_record.properties.container = chartContainer;
    		getPopUpChartData(_record.properties);
		});


		createAireasPopUpView({
			measures: {
				pm1: 	_record.properties.pm1float,
				pm25: 	_record.properties.pm25float,
				pm10: 	_record.properties.pm10float,
				no2:	_record.properties.no2float
			}
		});

	} else { // not clicked on any feature
		//console.log(data);
		return;
	} // do nothing if there's an error
  }

});

L.tileLayer.betterWms = function (url, options) {
  return new L.TileLayer.BetterWMS(url, options);
};




	L.LabelOverlay = L.Class.extend({
        initialize: function(/*LatLng*/ latLng, /*String*/ label, options) {
            this._latlng = latLng;
            this._label = label;
            L.Util.setOptions(this, options);
        },
        options: {
            offset: new L.Point(0, 2)
        },
        onAdd: function(map) {
            this._map = map;
            if (!this._container) {
                this._initLayout();
            }
            map.getPanes().overlayPane.appendChild(this._container);
            this._container.innerHTML = this._label;
            map.on('viewreset', this._reset, this);
            this._reset();
        },
        onRemove: function(map) {
            map.getPanes().overlayPane.removeChild(this._container);
            map.off('viewreset', this._reset, this);
        },
        _reset: function() {
            var pos = this._map.latLngToLayerPoint(this._latlng);
            var op = new L.Point(pos.x + this.options.offset.x, pos.y - this.options.offset.y);
            L.DomUtil.setPosition(this._container, op);
        },
        _initLayout: function() {
            this._container = L.DomUtil.create('div', 'leaflet-label-overlay');
        }
    });
/*
<style>
    .leaflet-popup-close-button {
        display:none;
    }

    .leaflet-label-overlay {
        line-height:0px;
        margin-top: 9px;
        position:absolute;
    }
</style>
*/


	// deeplink function
	// url overrules cookie variables ? or todo personal profile defaults?
	// maximum of 4 areas. Key of variables is area plus keyname e.g. "1city" or "1lan". "city" defaults to "0city" (zero).
	// variables: city, layer[,layer], mapCenterLat, mapCenterLng, viewZoomLevel
	var urlVars;
//	var areaVars;
	var areas;
	var currentArea;
	var currentAreaCode = 'EHV';
	var currentAreaCity = 'Eindhoven';
	//var areaCode = 'EHV'; // EHV, ASS, DLF

	var initAreas = function(count) {
		areas = [];
		for (var i=0;i<count;i++) {
			var _area = {};
			_area.areaId		= APRI.UTIL.apriGuid(_area.areaId);
			_area.active 		= false;
			_area.areaLayer 	= {};
			_area.deepLinkVars 	= {};
			areas.push(_area);
		}
	};

	var findArea = function(areaId) {
		var _areaIndex;
		for (var i=0; i<areas.length;i++) {
			if (areaId == areas[i].areaId) {
				_areaIndex = i;
				break;
			}
		}
		return _areaIndex;
	}

	var aireasLogoClick = function(e) {
		// experimental, first test
		//activateLayer('aireasGridGemLayer', currentArea);
		var layer = {};
		layer.name = 'aireasGridGemLayer';
		addRemoveLayerToMap(layer, currentArea);
	}

	var activateAreaLayerMenu = function(areaIndex) {
		console.log('Function: activateAreaLayerMenu');
		if (areas[areaIndex].apriTree != undefined) {
			return;
		}
		areas[areaIndex].apriTree = new ApriTreeBase();
//		areas[areaIndex].layerMenu = new ApriLayerMenu({containerId: 'sidebarlayers'});

		var sideBarAreaLayersMenuContainer = document.getElementById('sidebarlayers');
		var _ul = document.createElement('ul');
		_ul.classList.add("explorer");
		//logoContainer.className = 'logo-container';
		sideBarAreaLayersMenuContainer.appendChild(_ul);

//		// add new nodes
//		var _tmpTreeNode = apriTreeAddNode(apriTree.root, {name:'node123'});
//		apriTreeAddNode(_tmpTreeNode, {name:'node1231'});
//		apriTreeAddNode(_tmpTreeNode, {name:'node1232'});
//		var _tmpTreeNode = apriTreeAddNode(apriTree.root, {name:'node124'});
//		apriTreeAddNode(_tmpTreeNode, {name:'node1241'});
//		apriTreeAddNode(_tmpTreeNode, {name:'node1242'});
//		apriTreeAddNode(_tmpTreeNode, {name:'node1243'});
//		apriTreeAddNode(_tmpTreeNode, {name:'node1244'});


		var _treeNodeAreas = apriTreeAddNode(areas[areaIndex].apriTree.root, {name:'Areas'});
//		for (var i=0;i<areas.length;i++) {
//			var _tmpTreeNodeArea = apriTreeAddNode(_treeNodeAreas, {name:areas[areaIndex].deepLinkVars.city});
			//if (i== areaIndex) .....
//			for (var key in areas[areaIndex].layers ) {
//				var _tmpTreeNode = apriTreeAddNode(_tmpTreeNodeArea, {name:key});
//			}
//		}


		for (var _key in areaLayersPackagesList) {
			if ( _key == areas[areaIndex].areaCode) {
				var _treeNodeArea = apriTreeAddNode(_treeNodeAreas, {name:_key});
				var _areaLayersPackagesList = areaLayersPackagesList[_key];
				for (var _key2 in _areaLayersPackagesList.layerPackages) {
					var areaLayerPackage = areaLayerPackages[_key2];
					var _treeNodeLayersGroup;
					for (var i=0;i<areaLayerPackage.length;i++) {
						if (i==0) {
							_treeNodeLayersGroup = apriTreeAddNode(_treeNodeArea, {name:areaLayerPackage[i].group});
						}
						//if () {
						//} else {
						//}
						var _label = areaLayerPackage[i].label;
						var	_treeNodeLayersGroupLayer 		= apriTreeAddNode(_treeNodeLayersGroup, {name:_label});
						_treeNodeLayersGroupLayer.layer 	= areaLayerPackage[i].layer;
						_treeNodeLayersGroupLayer.sensor 	= areaLayerPackage[i].sensor;
						_treeNodeLayersGroupLayer.label 	= _label;
						_treeNodeLayersGroupLayer.areaId	= areas[areaIndex].areaId;
						_treeNodeLayersGroupLayer.areaCode	= areas[areaIndex].areaCode;
					}
				}
			}
		}

		//apriTree.render
		apriTreeRender(areas[areaIndex].apriTree.root, _ul);

	}

	var apriTreeAddNode = function(parentNode, newNode) {
		// Parse the new node
//		var _node = new ApriTreeBase.TreeNodeCollection();
		var _node = new ApriTreeBase.TreeNode();
		_node.name = newNode.name;
		// Add it to the parent
		if (parentNode.addChild) {
			return parentNode.addChild(_node);
		} else {
			return parentNode.addNode(_node);
		}
	}

	var apriTreeRender = function(treeNode, container) {

		var _treeLi = document.createElement('li');
//		_treeLi.innerHTML = treeNode.name;
		container.appendChild(_treeLi);
		var _treeLiActionBlock 		= document.createElement('div');

		if (!treeNode.layer) {
			var _treeLiShowHide 	= document.createElement('div');
			_treeLiActionBlock.appendChild(_treeLiShowHide);
		} else {
			var _treeLiCheckBoxAction		= document.createElement('div');
			_treeLiCheckBoxAction.classList.add('fa');
			_treeLiCheckBoxAction.classList.add('fa-map-o');
			_treeLiCheckBoxAction.treeNode = treeNode;
			_treeLiCheckBoxAction.addEventListener('click', toggleTreeAction, true);
//			_treeLiText.addEventListener('click', toggleTreeAction, true);
			_treeLiActionBlock.appendChild(_treeLiCheckBoxAction);
		}
		var _treeLiText		 		= document.createElement('div');
		_treeLiText.classList.add('tree-li-actionblock-text');
		_treeLiText.innerHTML		= treeNode.name;
		_treeLiActionBlock.appendChild(_treeLiText);

		_treeLi.appendChild(_treeLiActionBlock);
		container.appendChild(_treeLi);

		if (treeNode.children) {
			if (treeNode.name == 'root') {
				_treeLiActionBlock.parentNode.classList.add("treenode-root");
				_treeLiActionBlock.classList.add("treenode-root");
				_treeLiShowHide.classList.add('fa');
				_treeLiShowHide.classList.add('fa-folder-o');
//				_treeLiShowHide.classList.add("sub-nodes-plus-min");
				//_treeLiShowHide.parentNode.parentNode.classList.toggle("sub-nodes-invisible");
			} else {
				if (_treeLiShowHide) {
					_treeLiShowHide.classList.add('fa');
					_treeLiShowHide.classList.add('fa-folder-o');
//					_treeLiShowHide.classList.add("sub-nodes-plus-min");
					_treeLiShowHide.parentNode.parentNode.classList.toggle("sub-nodes-invisible");
				}
			}
			_treeLiShowHide?_treeLiShowHide.addEventListener('click', toggleSubNodes, true):null;

			var _ul = document.createElement('ul');
			_treeLi.appendChild(_ul);

			treeNode.children.each(function(node) {
				//var _node = node;
				//var _treeChildLi = document.createElement('li');
				//_treeChildLi.innerHTML = _node.name;
				//container.appendChild(_treeChildLi);

				//if (_node.children) {
				apriTreeRender(node, _ul);
				//}
			});
		};
	}


	var toggleTreeAction = function() {
		if (this.classList.contains('fa-check-square-o')) {
//			this.classList.add('fa-square-o');
			this.classList.add('fa-map-o');
			this.classList.remove('fa-check-square-o');
			if (this.treeNode.areaId) {
				var _areaIndex = findArea(this.treeNode.areaId);
				addRemoveLayerToMap(this.treeNode.layer, _areaIndex);
			}
		} else {
			this.classList.add('fa-check-square-o');
//			this.classList.remove('fa-square-o');
			this.classList.remove('fa-map-o');
			//map.addTo()
			if (this.treeNode.areaId) {
				var _areaIndex = findArea(this.treeNode.areaId);
				activateLayer(this.treeNode.layer, _areaIndex);
			}
		}

	}

	var toggleSubNodes = function() {
		if (this.parentNode.parentNode.classList.contains("sub-nodes-invisible")) {
			this.parentNode.parentNode.classList.remove("sub-nodes-invisible");
			this.classList.add('fa-folder-open-o');
			this.classList.remove('fa-folder-o');
		} else {
			this.parentNode.parentNode.classList.add("sub-nodes-invisible");
			this.classList.add('fa-folder-o');
			this.classList.remove('fa-folder-open-o');
		}
	}

	var areaLayerMenuMouseEnter = function(e) {
		var _areaIndex;
		// experimental, first test
		//activateLayer('aireasGridGemLayer', currentArea);
		var _id = this.id;
		if (this.areaId) {
			_areaIndex = findArea(this.areaId);
			console.log('Function: areaLayerMenuMouseEnter areadId: ', this.areaId, ' Index', _areaIndex );
			activateAreaLayerMenu(_areaIndex);
		}
	}
	var areaLayerMenuMouseLeave = function(e) {
		// experimental, first test
		//activateLayer('aireasGridGemLayer', currentArea);
		var _id = this.id;
	}


/*

	var activateD3Menu = function(areaIndex) {
		if (areas[areaIndex].d3menu == undefined) {
//			areas[areaIndex].d3menu = new ApriD3Menu({containerId: areas[areaIndex].areasButtonContainer.id});
			areas[areaIndex].d3menu = new ApriD3Menu({containerId: 'sidebarlayers'});
		}
		var menuData = {"name":"bubble", "children": [
{"name":"Een","description":"Atlas of Global Agriculture",
"children":[
    {"name": "Geography","address":"http://gli.environment.umn.edu", "note":"Global crop geography, including precipitation, temperature, crop area, etc."},
    {"name": "Crop Land","address":"http://d3js.org"},
    {"name": "Crop Yields","address":"http://environment.umn.edu", "note":"Maize, wheat, rice, and soybean yields in 2000"}
]},
{"name": "Twee", "description": "Virtual Lab of Global Agriculture",
"children":[
    {"name":"Excess Nutrient","address":"http://d3js.org","note":"Prototype Infographics on Excess Fertilizer Nutrients"},
    {"name":"Yield Gap","address":"http://d3js.org", "note":"The gap between attainable yields and actual yields, with modeled yields assuming the percentage of gap closed."},
    {"name":"Fertilizer","address":"http://sunsp.net"}
]},
{"name":"Nutshell", "description":"Profiles of Country",
"children":[
    {"name":"Efficiency","address":"http://d3js.org"},
    {"name":"Excess Nutrient","address":"http://d3js.org"},
    {"name":"Economy","address":"http://d3js.org"},
    {"name":"Agriculture","address":"http://uis.edu/ens"}
]},
{"name":"Data", "description":"Crop Data in 5 minutes grid",
"children":[
    {"name":"Geography","address":"http://www.earthstat.org/"},
    {"name":"Crop Land","address":"http://www.earthstat.org/"},
    {"name":"Crop Yields","address":"http://www.earthstat.org/"}
]}
]}

		areas[areaIndex].d3menu.createD3Menu({menuData:menuData});
	}


	var d3MenuMouseEnter = function(e) {
		var _areaIndex;
		// experimental, first test
		//activateLayer('aireasGridGemLayer', currentArea);
		var _id = this.id;
		if (this.areaId) {
			_areaIndex = findArea(this.areaId);
			activateD3Menu(_areaIndex);
		}
	}
	var d3MenuMouseLeave = function(e) {
		// experimental, first test
		//activateLayer('aireasGridGemLayer', currentArea);
		var _id = this.id;
	}
*/

	var areaClick = function(e) {
		if (this.activated == true ) {
			this.activated = false;
//			this.style.color = 'black';
			this.style['border-color'] = 'white';
		} else {
			this.activated = true;
//			this.style.color = 'white';
			this.style['border-color'] = '#739181';
			var areaIndex = findArea(this.areaId);
			activateAreaLayerMenu(areaIndex);
			//var addRemoveLayerToMap = function(layer, areaIndex) {
		}
	}





	var newAreaClick = function(e) {
		if (this.activated == true ) {
			this.activated = false;
			this.style.color = 'black';
			this.style.backgroundColor = 'white';
		} else {
			this.activated = true;
			this.style.color = 'white';
			this.style.backgroundColor = 'cadetblue';
		}
	}

	var layerObjectsDefaults = {};
	var layerObjects = {};

	layerObjectsDefaults['L.geoJson'] = {
		options: {
				style: function (feature) {}
				, refreshData:true
		}
	};
	layerObjectsDefaults['L.heatLayer'] = {
		options: {
				refreshData:true
		}
	};
	layerObjectsDefaults['wms'] = {
		type: 'wms',
		siteProtocol: 'http',  		//siteProtocol
		sitePrefixExtern: '', 		//sitePrefixExtern
		url: 'openiod.org/inspire/wms',
		options: {
			layerType:'defaultLayer',
			layers: 'defaultLayerName',
	        format: 'image/png',
	        transparent: true,
			tiled: true,
			zIndex: 2,
	        //crs: RDcrs,
    		crs: L.CRS.EPSG28992,
			//	tilesorigin: [-180, 90],
            attribution: "default label"
		}
	};
	layerObjectsDefaults['betterwms'] = {
		type: 'wms',
		siteProtocol: 'http',  		//siteProtocol
		sitePrefixExtern: '', 		//sitePrefixExtern
		url: 'openiod.org/inspire/wms',
		options: {
			layerType:'defaultLayer',
			layers: 'defaultLayerName',
	        format: 'image/png',
	        transparent: true,
			tiled: true,
			zIndex: 2,
	        //crs: RDcrs,
    		crs: L.CRS.EPSG28992,
			//	tilesorigin: [-180, 90],
            attribution: "default label"
		}
	};






	layerObjects['aireasMeetkastenLayer'] = {
		type: 'L.geoJson',
		options: {
			layerType:'aireasMeetkastenLayer'
			, onEachFeature:onEachAireasMeetkastFeature
			, pointToLayer: function (feature, latlng) {
				var marker = markers.airboxMarkerGreen;
/*
				if (feature.properties.no2>0) {
					 marker = airboxMarkerBlue;
				}
				if (feature.properties.ufp>0) {
					 marker = airboxMarkerPurple;
				}
				if (feature.properties.ufp>0 && feature.properties.no2>0) {
					 marker = airboxMarkerDarkPurple;
				}
*/
/*
				if (feature.properties.airbox == '2.cal' |
					feature.properties.airbox == '3.cal' |
					feature.properties.airbox == '21.cal' |
					feature.properties.airbox == '16.cal' |
					feature.properties.airbox == '39.cal' ) {
						marker = markers.airboxMarkerBlue;
				} else {
					if (feature.properties.airbox == '9.cal' |
						feature.properties.airbox == '12.cal' |
						feature.properties.airbox == '23.cal' |
						feature.properties.airbox == '31.cal' |
						feature.properties.airbox == '33.cal' ) {
						marker = markers.airboxMarkerDarkPurple;
					} else {
						//return -1;
					}
				}
*/
				return L.marker(latlng, { icon: marker} );
			}
			, refreshData:true
			, loadData:
				function (layer, param) {
					ajaxGetData(siteAireas + "/data/aireas/getActualMeasures/*",
						function(data) {
							layer.addData(JSON.parse(data));
						}
					)
            	}
		}
	}




	layerObjects['waterschapGrenzenLayer'] = {
		type: 'betterwms',
		siteProtocol: 'http',  		//siteProtocol
		sitePrefixExtern: '', 	//sitePrefixExtern
		url: 'maps.waterschapservices.nl/inspire/wms',
		options: {
			layerType:'waterschapGrenzenLayer',
			layers: 'AU.AdministrativeUnit',
//            format: 'image/png',
//            transparent: true,
//			zIndex: 2,
//			tiled: true,
//   		    crs: L.CRS.EPSG28992,
			crs: L.CRS.EPSG4326,
           	attribution: "Waterschapsgrenzen"
		}
	}



	layerObjects['bijenGifLayer'] = {
		type: 'L.geoJson',
		options: {
			layerType:'bijenGifLayer'
			, zIndex: 2
//			, style: function (feature) {
//				var color="#000000";
//				var fillOpacity = 0;
//				var opacity = 0.8; //line opacity
  //      		return {color: color, opacity:opacity, weight:1, fillColor:color, fillOpacity:fillOpacity};
//    		}

			,style: function(feature) {
//				if (feature.properties.JGMKNavg > feature.properties.JGMKNnorm) {
				var _nof = parseFloat(feature.properties.JGMKNnof);
				if (feature.properties.JGMKNnof > 1) {  //normoverschrijdend
					return {color: "#FF0000", weight:2};
				} else if (feature.properties.JGMKNnof <=1){ //voldoet aan de norm
					return {color: "#0000FF", weight:2};
				} else return {color: "#333333", weight:2};

//        		switch (feature.properties.party) {
//            	case 'Republican': return {color: "#ff0000"};
//            	case 'Democrat':   return {color: "#0000ff"};
//        		}
				//return {color: "#0000ff", weight:2};
    		}

			, onEachFeature:onEachBijenGifFeature
			, pointToLayer: function (feature, latlng) {
				return L.marker(latlng, { icon: trainIcon} );
			}
			, refreshData:true
			, loadData:	function (layer, param) {

	//				http://localhost:4000/SCAPE604/openiod?SERVICE=WPS&REQUEST=Execute&identifier=pestinfo

//				ajaxGetData2(APRI.getConfig().urlSystemRoot + "/data/aireas/getCbsGemInfo/*",
				ajaxGetData2("https://openiod.org/SCAPE604/openiod?SERVICE=WPS&REQUEST=Execute&identifier=pestinfo" ,
//				ajaxGetData2(siteAireas + "/openiod?SERVICE=WPS&REQUEST=Execute&identifier=pestinfo" ,
					function(data) {
						var _data = JSON.parse(data)
						layer.addData(_data);
//						var _dataEnvelope = {};

//						_dataEnvelope.geometry =_data[0].envelope;
//						_dataEnvelope.type = 'Feature';
//						_dataEnvelope.properties = _data[0].properties;
//						var _dataCentroid = {};
//						_dataCentroid.geometry =_data[0].centroid;

//						var layer2 = {};
//						layer2.name = 'cbsGridGemEnvelopeLayer';
//						layer2.layerObjectName = 'cbsGridGemEnvelopeLayer';
//						activateLayer(layer2, layer.areaIndex);
////						addRemoveLayerToMap(layer2, layer.areaIndex);
//						initCbsGridGemEnvelopeLayer(layer2, layer.areaIndex, _dataEnvelope, _dataCentroid);
//						//var eindhovenLatLng = L.latLng( 51.43881, 5.48046 );
//							//	L.marker(eindhovenLatLng, { icon: trainIcon} ).addTo(map);
//						//map.panTo(eindhovenLatLng);
					}
				)


           	}
		}
	}

	layerObjects['pestInfoStofKentallen'] = {
		type: 'L.geoJson',
		options: {
			layerType:'pestInfoStofKentallen'
			, zIndex: 2
//			, style: function (feature) {
//				var color="#000000";
//				var fillOpacity = 0;
//				var opacity = 0.8; //line opacity
  //      		return {color: color, opacity:opacity, weight:1, fillColor:color, fillOpacity:fillOpacity};
//    		}

			,style: function(feature) {


				if (layerObjects['pestInfoStofKentallen'].options.currentPiAgrTypeId == "JGMKNnon" ) {

//				if (feature.properties.JGMKNavg > feature.properties.JGMKNnorm) {
				var _nof = parseFloat(feature.properties.JGMKNnof);
				if (feature.properties.JGMKNnof > 5) {  //normoverschrijdend
					return {fillOpacity: 0.8,fillColor: "#FF0000", color: "#000000", weight:2};
				} else 	if (feature.properties.JGMKNnof > 1) {  //normoverschrijdend
					return {fillOpacity: 0.8,fillColor: "orange", color: "#000000", weight:2};
				} else if (feature.properties.JGMKNnof <=1){ //voldoet aan de norm
					return {fillOpacity: 0.8,fillColor: "#00FF00",color: "#000000", weight:2};
				} else return {fillOpacity: 0.8,fillColor: "#333333",color: "#000000", weight:2};

				}
				if (layerObjects['pestInfoStofKentallen'].options.currentPiAgrTypeId == "aang" ) {
//				if (feature.properties.JGMKNavg > feature.properties.JGMKNnorm) {
				var _nof = parseFloat(feature.properties.JGMKNnof);
				if (feature.properties.JGMKNnof > 5) {  //normoverschrijdend
					return {fillOpacity: 0.8,fillColor: "#FF0000", color: "#000000", weight:2};
				} else 	if (feature.properties.JGMKNnof > 1) {  //normoverschrijdend
					return {fillOpacity: 0.8,fillColor: "orange", color: "#000000", weight:2};
				} else if (feature.properties.JGMKNnof <=1){ //voldoet aan de norm
					return {fillOpacity: 0.8,fillColor: "#00FF00",color: "#000000", weight:2};
				} else return {fillOpacity: 0.8,fillColor: "#333333",color: "#000000", weight:2};

				}



//        		switch (feature.properties.party) {
//            	case 'Republican': return {color: "#ff0000"};
//            	case 'Democrat':   return {color: "#0000ff"};
//        		}
				//return {color: "#0000ff", weight:2};
    		}

			, onEachFeature:onEachPestInfoStofKentallenFeature
//			, pointToLayer: function (feature, latlng) {
//				return L.marker(latlng, { icon: trainIcon} );
//			}
			, pointToLayer: function (feature, latlng) {
				return L.circleMarker(latlng, {
					radius: 6,
					fillColor: "#ff7800",
					color: "#000",
					weight: 0.2,
					opacity: 0.4,
					fillOpacity: 0.8
				});
			}
			, refreshData:true
			, loadData:	function (layer, param) {

				if (piAgrTypes == undefined) {
					initDropDownPestinfo({container:mapPanes.controlerPane, layer:layer});
				};

				if (param.piAgrJaar==undefined) return;

	//				http://localhost:4000/SCAPE604/openiod?SERVICE=WPS&REQUEST=Execute&identifier=pestinfo&action=getPeriHwStofLocJaarData

//				ajaxGetData2(APRI.getConfig().urlSystemRoot + "/data/aireas/getCbsGemInfo/*",
				ajaxGetData2("https://openiod.org/SCAPE604/openiod?SERVICE=WPS&REQUEST=Execute&identifier=pestinfo&action=getPeriHwStofLocJaarData" +
				             "&piAgrJaar="+ param.piAgrJaar + "&piAquoCode="+ param.piAquoCode + "&piAgrType="+ param.piAgrType ,
//				ajaxGetData2(siteAireas + "/openiod?SERVICE=WPS&REQUEST=Execute&identifier=pestinfo" ,
					function(data) {
						layer.clearLayers();
						var _data = JSON.parse(data)
						for (var i=0;i<_data.length;i++) {
							_data[i].properties.layer = layer;
						}
						layer.addData(_data);
//						var _dataEnvelope = {};

//						_dataEnvelope.geometry =_data[0].envelope;
//						_dataEnvelope.type = 'Feature';
//						_dataEnvelope.properties = _data[0].properties;
//						var _dataCentroid = {};
//						_dataCentroid.geometry =_data[0].centroid;

//						var layer2 = {};
//						layer2.name = 'cbsGridGemEnvelopeLayer';
//						layer2.layerObjectName = 'cbsGridGemEnvelopeLayer';
//						activateLayer(layer2, layer.areaIndex);
////						addRemoveLayerToMap(layer2, layer.areaIndex);
//						initCbsGridGemEnvelopeLayer(layer2, layer.areaIndex, _dataEnvelope, _dataCentroid);
//						//var eindhovenLatLng = L.latLng( 51.43881, 5.48046 );
//							//	L.marker(eindhovenLatLng, { icon: trainIcon} ).addTo(map);
//						//map.panTo(eindhovenLatLng);
					}
				)


           	}
		}
	}

	var piAgrTypes, 		piAgrTypeSelected, 	dropDownPiAgrTypeListAContainer, 	dropDownPiAgrTypeListADispatchers;
	var piAgrJaren, 		piAgrJaarSelected, 	dropDownPiAgrJaarListContainer, 	dropDownPiAgrJaarListDispatchers;
	var piAquoCodes, 	piAquoCodeSelected, 	dropDownPiAquoCodeListAContainer, 	dropDownPiAquoCodeListADispatchers;


	// A drop-down menu for selecting a state; uses the "menu" namespace.
	var initDropDownPestinfo = function(options) {
		//var _city;
		/*
		PiAgrTypeListA:
		- aang / aantal aangetroffen
		- avg / Gemiddelde
		- JGMKNnon / Aantal jaargemiddelde overschreden
		- JGMKNnof / toetsing norm jaargemiddelde (richtlijn)
		- JGMKNcmlnof / toetsing norm jaargemiddelde (cml)
		- MACmax / Maximum tbv toetsing
		- MACnof / toetsing norm jaarmaximum (richtlijn)
		*/
		//Jaar 2000 - 2015
		/*
		stofLijstA
		- imdcpd / imidacloprid
		*/

		piAgrJaren 	= d3.map( {	  "2014":{id:"2014",name:"2014"}
								,"2015":{id:"2015",name:"2015"}} );
		piAgrTypes 	= d3.map( {	"aantal aangetroffen":{id:"aang",name:"aantal aangetroffen"}
								,"Gemiddelde":{id:"avg",name:"Gemiddelde"}
								,"JGMKNnon":{id:"JGMKNnon",name:"JGMKNnon"}} );
		piAquoCodes = d3.map( {	"imidacloprid":{id:"imdcpd",name:"imidacloprid"} //imdcpd
								,"fipronil":{id:"fipnl",name:"fipronil"}} );

		var container 							= document.getElementsByClassName('leaflet-bottom leaflet-left')[0];
		var dropDownPestinfoContainer 			= document.createElement('div');
		dropDownPestinfoContainer.className 	= dropDownPestinfoContainer.className + " leaflet-control ";

		dropDownPiAgrTypeListAContainer 			= document.createElement('div');
		dropDownPiAgrTypeListAContainer.id 		= APRI.UTIL.apriGuid(dropDownPiAgrTypeListAContainer.id );
		dropDownPiAgrTypeListAContainer.className = dropDownPiAgrTypeListAContainer.className + " leaflet-control pestinfo-selector";
		dropDownPestinfoContainer.appendChild(dropDownPiAgrTypeListAContainer);

		dropDownPiAgrJaarListContainer 			= document.createElement('div');
		dropDownPiAgrJaarListContainer.id 		= APRI.UTIL.apriGuid(dropDownPiAgrJaarListContainer.id );
		dropDownPiAgrJaarListContainer.className	= dropDownPiAgrJaarListContainer.className + " leaflet-control pestinfo-selector";
		dropDownPestinfoContainer.appendChild(dropDownPiAgrJaarListContainer);

		dropDownPiAquoCodeListAContainer 			= document.createElement('div');
		dropDownPiAquoCodeListAContainer.id 		= APRI.UTIL.apriGuid(dropDownPiAquoCodeListAContainer.id );
		dropDownPiAquoCodeListAContainer.className	= dropDownPiAquoCodeListAContainer.className + " leaflet-control pestinfo-selector";
		dropDownPestinfoContainer.appendChild(dropDownPiAquoCodeListAContainer);

		container.appendChild(dropDownPestinfoContainer);

		// set default
		if (areas[currentArea].deepLinkVars.piAgrJaar == undefined) {
			areas[currentArea].deepLinkVars.piAgrType 	= 'JGMKNnon';
			areas[currentArea].deepLinkVars.piAgrJaar 	= '2015';
			areas[currentArea].deepLinkVars.piAquoCode 	= 'imidacloprid';
		}

		var currentPiAgrJaar					= areas[currentArea].deepLinkVars.piAgrJaar;
		var currentPiAgrJaarId					= areas[currentArea].deepLinkVars.piAgrJaar;
		var currentPiAgrType					= areas[currentArea].deepLinkVars.piAgrType;
		var currentPiAgrTypeId					= areas[currentArea].deepLinkVars.piAgrType;
		var currentPiAquoCode					= areas[currentArea].deepLinkVars.piAquoCode;
		var currentPiAquoCodeId					= areas[currentArea].deepLinkVars.piAquoCode;

		dropDownPiAgrTypeListADispatchers		= d3.dispatch("load", "statechange");
		dropDownPiAgrJaarListDispatchers		= d3.dispatch("load", "statechange");
		dropDownPiAquoCodeListADispatchers		= d3.dispatch("load", "statechange");




		dropDownPiAgrJaarListDispatchers.on("load.menu", function(piAgrJaren) {
  			piAgrJaarSelected = d3.select("#"+dropDownPiAgrJaarListContainer.id)
    			.append("div")
    			.append("select")
      			.on("change", function() {
					dropDownPiAgrJaarListDispatchers.statechange(piAgrJaren.get(this.value));
				});
			piAgrJaarSelected.selectAll("option")
      			.data(piAgrJaren.values())
    			.enter().append("option")
      			.attr("value", function(d) {
					return d.name;
					})
      			.text(function(d) { return d.name; });
			dropDownPiAgrJaarListDispatchers.on("statechange.menu", function(opt) {
				if (opt == undefined) return;
				var _piAgrJaar = opt.name;
				areas[currentArea].deepLinkVars.piAgrJaar = _piAgrJaar;
				setPushState();
    			piAgrJaarSelected.property("value", _piAgrJaar);
				currentPiAgrJaar = "" + areas[currentArea].deepLinkVars.piAgrJaar;
				currentPiAgrJaarId = opt.id;

				//todo: activate layer
				layerObjects['pestInfoStofKentallen'].options.loadData(options.layer,{piAgrJaar:currentPiAgrJaarId,piAquoCode:currentPiAquoCodeId,piAgrType:currentPiAgrTypeId});

				//initCbsGridGemLayer(_cityTmp);
				//cbsGridGemLayer.addTo(map);
  			});
		});

		dropDownPiAquoCodeListADispatchers.on("load.menu", function(piAquoCodes) {
  			piAquoCodeSelected = d3.select("#"+dropDownPiAquoCodeListAContainer.id)
    			.append("div")
    			.append("select")
      			.on("change", function() {
					dropDownPiAquoCodeListADispatchers.statechange(piAquoCodes.get(this.value));
				});
			piAquoCodeSelected.selectAll("option")
      			.data(piAquoCodes.values())
    			.enter().append("option")
      			.attr("value", function(d) {
					return d.name;
					})
      			.text(function(d) { return d.name; });
			dropDownPiAquoCodeListADispatchers.on("statechange.menu", function(opt) {
				if (opt == undefined) return;
				var _piAquoCode = opt.name;
				areas[currentArea].deepLinkVars.piAquoCode = _piAquoCode;
				setPushState();
    			piAquoCodeSelected.property("value", _piAquoCode);
				currentPiAquoCode = areas[currentArea].deepLinkVars.piAquoCode;
				currentPiAquoCodeId = opt.id;

				//todo: activate layer
				layerObjects['pestInfoStofKentallen'].options.loadData(options.layer,{piAgrJaar:currentPiAgrJaarId,piAquoCode:currentPiAquoCodeId,piAgrType:currentPiAgrTypeId});

				//initCbsGridGemLayer(_cityTmp);
				//cbsGridGemLayer.addTo(map);
  			});
		});

		dropDownPiAgrTypeListADispatchers.on("load.menu", function(piAgrTypes) {
  			piAgrTypeSelected = d3.select("#"+dropDownPiAgrTypeListAContainer.id)
    			.append("div")
    			.append("select")
      			.on("change", function() {
      			    var _tmp1 = piAgrTypes.get(this.value);
					dropDownPiAgrTypeListADispatchers.statechange(piAgrTypes.get(this.value));
				});
			piAgrTypeSelected.selectAll("option")
      			.data(piAgrTypes.values())
    			.enter().append("option")
      			.attr("value", function(d) {
					return d.name;
					})
      			.text(function(d) { return d.name; });
			dropDownPiAgrTypeListADispatchers.on("statechange.menu", function(opt) {
				if (opt == undefined) return;
				var _piAgrType = opt.name;
				areas[currentArea].deepLinkVars.piAgrType = _piAgrType;
				setPushState();
    			piAgrTypeSelected.property("value", _piAgrType);
				currentPiAgrType = areas[currentArea].deepLinkVars.piAgrType;
				currentPiAgrTypeId = opt.id;


				layerObjects['pestInfoStofKentallen'].options.currentPiAgrTypeId = currentPiAgrTypeId;
				layerObjects['pestInfoStofKentallen'].options.loadData(options.layer,{piAgrJaar:currentPiAgrJaarId,piAquoCode:currentPiAquoCodeId,piAgrType:currentPiAgrTypeId});
//				layerObjects['pestInfoStofKentallen'].options.layer.setStyle({
        //    fillColor: hues[division],
         //   fillOpacity: 0.8,
         //   weight: 0.5
//        });

//				loadData(options.layer,{piAgrJaar:currentPiAgrJaarId,piAquoCode:currentPiAquoCodeId,piAgrType:currentPiAgrTypeId});

				//todo: activate layer

				//initCbsGridGemLayer(_cityTmp);
				//cbsGridGemLayer.addTo(map);
  			});
		});



		dropDownPiAgrTypeListADispatchers.load(piAgrTypes);
  		dropDownPiAgrTypeListADispatchers.statechange(
			piAgrTypes.get(areas[currentArea].deepLinkVars.piAgrType)
		);

		dropDownPiAgrJaarListDispatchers.load(piAgrJaren);
  		dropDownPiAgrJaarListDispatchers.statechange(
			piAgrJaren.get(areas[currentArea].deepLinkVars.piAgrJaar)
		);

		dropDownPiAquoCodeListADispatchers.load(piAquoCodes);
  		dropDownPiAquoCodeListADispatchers.statechange(
			piAquoCodes.get(areas[currentArea].deepLinkVars.piAquoCode)
		);

	};





	layerObjects['cbsGridGemEnvelopeLayer'] = {
		type: 'L.geoJson',
		options: {
			layerType:'cbsGridGemEnvelopeLayer'
			, style: function (feature) {
				var color="#000000";
				var fillOpacity = 0;
				var opacity = 0.2; //line opacity
        		return {transform:"scale(2)", color: color, opacity:opacity, weight:4, fillColor:color, fillOpacity:fillOpacity};
    		}
		}
	}


	layerObjects['cbsGridGemLayer'] = {
		type: 'L.geoJson',
		options: {
			layerType:"cbsGridGemLayer"
			, style: function (feature) {
				var color="#000000";
				var fillOpacity = 0;
				var opacity = 0.8; //line opacity
        		return {color: color, opacity:opacity, weight:1, fillColor:color, fillOpacity:fillOpacity};
    		}
		//	, onEachFeature:onEachAireasGridGemFeature
			, pointToLayer: function (feature, latlng) {
				return L.marker(latlng, { icon: trainIcon} );
			}
			, refreshData:true
			, loadData:	function (layer, param) {
//				ajaxGetData2(APRI.getConfig().urlSystemRoot + "/data/aireas/getCbsGemInfo/*",
				ajaxGetData2(siteAireas + "/data/aireas/getCbsGemInfo/*?gm_naam=" + param.areaCity,  // "Eindhoven",
					function(data) {
						var _data = JSON.parse(data)
						layer.addData(_data);
						var _dataEnvelope = {};

						_dataEnvelope.geometry =_data[0].envelope;
						_dataEnvelope.type = 'Feature';
						_dataEnvelope.properties = _data[0].properties;
						var _dataCentroid = {};
						_dataCentroid.geometry =_data[0].centroid;

						var layer2 = {};
						layer2.name = 'cbsGridGemEnvelopeLayer';
						layer2.layerObjectName = 'cbsGridGemEnvelopeLayer';
						activateLayer(layer2, layer.areaIndex);
//						addRemoveLayerToMap(layer2, layer.areaIndex);
						initCbsGridGemEnvelopeLayer(layer2, layer.areaIndex, _dataEnvelope, _dataCentroid);
						//var eindhovenLatLng = L.latLng( 51.43881, 5.48046 );
							//	L.marker(eindhovenLatLng, { icon: trainIcon} ).addTo(map);
						//map.panTo(eindhovenLatLng);
					}
				)
           	}
		}
	}







	layerObjects['aireasGridGemLayer'] = {
		type: 'L.geoJson',
		options: {
				layerType:'aireasGridGemLayer'
				, properties: {
					retrievedDateCache: []
				}
				, style: function (feature) {
					var color="#000000";
					var fillOpacity = 0.4;
					var cr=0;
					var cy=0;
					var cg=0;
					var r = 0;
					var g = 0;
					var b = 0;
					///var valueRounded = Math.round(feature.properties.avg_pm_all_hr*10)/10;
					var valueRounded = feature.properties.avg_avg; //Math.round(feature.properties.avg_avg*10)/10;

					color = aireasDomainsRanges[feature.properties.avg_type].scale(valueRounded);

					if (valueRounded == 0) {
						fillOpacity = 0.1;
					} else {
						fillOpacity = 0.8 + (valueRounded%2)/10;  // domainGroups ; //0.8;
					}
					if (valueRounded <20) {
						fillOpacity -= 0.5;
					}

					var opacity = 0.1; //line opacity
					//fillOpacity =1;
        			return {color: '#888', opacity:opacity, weight:1, fillColor:color, fillOpacity:fillOpacity};
    			}
				, onEachFeature:onEachAireasGridGemFeature
				, pointToLayer: function (feature, latlng) {
					return L.marker(latlng, { icon: trainIcon} );
				}
				, loadData: function(layer, options) {
			//var _tmpDate1 = new Date(retrieveddatemax);

			for (var i=0; i<options.properties.retrievedDateCache.length;i++) {
				var diff = options.properties.retrievedDateCache[i].retrievedDateDate.getTime() - new Date(options.properties.retrievedDateMax).getTime();
				if (diff > -480000 && diff < 480000) {  //less than 9min = hit
					options.properties.retrievedDateMax = options.properties.retrievedDateCache[i].retrievedDate;
					//console.log('retrieveddate (cache/hit): ' + retrievedDateMax + ' '+options.retrievedDateMax);
					window.setTimeout(function(){
						layer.clearLayers();
						layer.addData(options.properties.retrievedDateCache[i].data);
						layer.layerControl[0].setActiveDateTime(options.properties.retrievedDateMax, '(cache)');  //timeSliderCtrl
						if (options.next) {
							var _newDate = new Date(new Date(options.properties.retrievedDateMax).getTime()+ 600000);  // +10 minutes for next measure, no need for extra marge here
							//console.log('retrieveddate next : ' + _newDate.toISOString());
							playSliderMovie(layer, _newDate, options.properties.avgType);
						}
					}, 200);
					return;
				}
			}

			var retrievedDatePlusMargeIso = new Date(new Date(options.properties.retrievedDateMax).getTime()+60000).toISOString();

			// todo add areaCode parameter

//			ajaxGetData(APRI.getConfig().urlSystemRoot +
			ajaxGetData( siteAireas +
				 "/data/aireas/getAireasGridGemInfo/*?retrieveddatemax=" +
				 retrievedDatePlusMargeIso + '&avgType=' + options.properties.avgType ,
				function(data) {
					var _data = JSON.parse(data);
					if (_data.length == 0 ) return;
					var _retrievedDate = _data[0].properties.retrieveddate;

					var _retrievedDateCacheRecord={};
					_retrievedDateCacheRecord.data = _data;
					_retrievedDateCacheRecord.retrievedDate = _retrievedDate;
					_retrievedDateCacheRecord.retrievedDateDate = new Date(_retrievedDate);
					options.properties.retrievedDateCache.push(_retrievedDateCacheRecord);  // store in cache
					//console.log('retrieveddate (new cache): ' + _retrievedDate);


//					retrievedDateMax = _retrievedDate; //_retrievedDate?_retrievedDate:options.retrievedDateMax;
					layer.clearLayers();
					layer.addData(_data);
					layer.layerControl[0].setActiveDateTime(_retrievedDateCacheRecord.retrievedDateDate, '(db)'); //timeSliderCtrl

					if (options.next) {
						var _newDate = new Date(new Date(options.properties.retrievedDateMax).getTime()+ 600000);  // +10 minutes for next measure, no need for extra marge here
						//console.log('retrieveddate next : ' + _newDate.toISOString());
						window.setTimeout(function(){
							playSliderMovie(layer, _newDate, options.properties.avgType);
						}, 200);
					}
				}
			)
		}
		}
	}




	layerObjects['luftDatenEurSmallLayer'] = {
		type: 'L.geoJson',
		options: {
				layerType:'luftDatenEurSmallLayer'
				, properties: {
					retrievedDateCache: []
				}
				, style: function (feature) {
					var color="#000000";
					var fillOpacity = 0.4;
					var cr=0;
					var cy=0;
					var cg=0;
					var r = 0;
					var g = 0;
					var b = 0;
					///var valueRounded = Math.round(feature.properties.avg_pm_all_hr*10)/10;
					var valueRounded = feature.properties.avg_avg; //Math.round(feature.properties.avg_avg*10)/10;

					color = aireasDomainsRanges[feature.properties.avg_type].scale(valueRounded);

					if (valueRounded == 0) {
						fillOpacity = 0.1;
					} else {
						fillOpacity = 0.8 + (valueRounded%2)/10;  // domainGroups ; //0.8;
					}
					if (valueRounded <20) {
						fillOpacity -= 0.5;
					}

					var opacity = 0.1; //line opacity

        			return {color: '#888', opacity:opacity, weight:1, fillColor:color, fillOpacity:fillOpacity};
    			}
				, onEachFeature:onEachLuftDatenGridFeature
				, pointToLayer: function (feature, latlng) {
					return L.marker(latlng, { icon: trainIcon} );
				}
				, loadData: function(layer, options) {
			//var _tmpDate1 = new Date(retrieveddatemax);

			for (var i=0; i<options.properties.retrievedDateCache.length;i++) {
				var diff = options.properties.retrievedDateCache[i].retrievedDateDate.getTime() - new Date(options.properties.retrievedDateMax).getTime();
				if (diff > -240000 && diff < 240000) {  //less than 4min = hit
					options.properties.retrievedDateMax = options.properties.retrievedDateCache[i].retrievedDate;
					//console.log('retrieveddate (cache/hit): ' + retrievedDateMax + ' '+options.retrievedDateMax);
					window.setTimeout(function(){
						layer.clearLayers();
						layer.addData(options.properties.retrievedDateCache[i].data);
						layer.layerControl[0].setActiveDateTime(options.properties.retrievedDateMax, '(cache)');  //timeSliderCtrl
						if (options.next) {
							var _newDate = new Date(new Date(options.properties.retrievedDateMax).getTime()+ 300000);  // +50 minutes for next measure, no need for extra marge here
							//console.log('retrieveddate next : ' + _newDate.toISOString());
							playSliderMovie(layer, _newDate, options.properties.avgType);
						}
					}, 100);
					return;
				}
			}

			var retrievedDatePlusMargeIso = new Date(new Date(options.properties.retrievedDateMax).getTime()+60000).toISOString();

//			ajaxGetData(APRI.getConfig().urlSystemRoot +
			ajaxGetData( siteAireas +
				 "/data/aireas/getGridApriSensorInfo/*?avgdatetimemax=" +
				 retrievedDatePlusMargeIso + '&avgType=' + options.properties.avgType + '&areaCode=' + options.properties.areaCode ,
				function(data) {
					var _data = JSON.parse(data);
					if (_data.length == 0 ) return;
					var _retrievedDate = _data[0].properties.avg_datetime; //retrieveddate;

					var _retrievedDateCacheRecord={};
					_retrievedDateCacheRecord.data = _data;
					_retrievedDateCacheRecord.retrievedDate = _retrievedDate;
					_retrievedDateCacheRecord.retrievedDateDate = new Date(_retrievedDate);
					options.properties.retrievedDateCache.push(_retrievedDateCacheRecord);  // store in cache
					//console.log('retrieveddate (new cache): ' + _retrievedDate);
					options.properties.retrievedDateMax = _retrievedDate;  // set retrieveddate to latest read date

					if (options.properties.timeSpan == undefined) {
						// calculate timespan for timeslider correction to the last retrieveable date instead of current date
						var a = new Date();
						var b = new Date(_retrievedDate);
						var _timeSpan = a.getTime() - b.getTime();
						options.properties.timeSpan = _timeSpan;
					}


//					retrievedDateMax = _retrievedDate; //_retrievedDate?_retrievedDate:options.retrievedDateMax;
					layer.clearLayers();
					layer.addData(_data);
					layer.layerControl[0].setActiveDateTime(_retrievedDateCacheRecord.retrievedDateDate, '(db)'); //timeSliderCtrl

					if (options.next) {
						var _newDate = new Date(new Date(options.properties.retrievedDateMax).getTime()+ 300000);  // +5 minutes for next measure, no need for extra marge here
						//console.log('retrieveddate next : ' + _newDate.toISOString());
						window.setTimeout(function(){
							playSliderMovie(layer, _newDate, options.properties.avgType);
						}, 10);
					}
				}
			)
		}
		}
	}

	layerObjects['luftDatenStuttgartLayer'] = {
		type: 'L.geoJson',
		options: {
				layerType:'luftDatenStuttgartLayer'
				, properties: {
					retrievedDateCache: []
				}
				, style: function (feature) {
					var color="#000000";
					var fillOpacity = 0.4;
					var cr=0;
					var cy=0;
					var cg=0;
					var r = 0;
					var g = 0;
					var b = 0;
					///var valueRounded = Math.round(feature.properties.avg_pm_all_hr*10)/10;
					var valueRounded = feature.properties.avg_avg; //Math.round(feature.properties.avg_avg*10)/10;

					color = aireasDomainsRanges[feature.properties.avg_type].scale(valueRounded);

					if (valueRounded == 0) {
						fillOpacity = 0.1;
					} else {
						fillOpacity = 0.8 + (valueRounded%2)/10;  // domainGroups ; //0.8;
					}
					if (valueRounded <20) {
						fillOpacity -= 0.5;
					}

					var opacity = 0.1; //line opacity

        			return {color: '#888', opacity:opacity, weight:1, fillColor:color, fillOpacity:fillOpacity};
    			}
				, onEachFeature:onEachLuftDatenGridFeature
				, pointToLayer: function (feature, latlng) {
					return L.marker(latlng, { icon: trainIcon} );
				}
				, loadData: function(layer, options) {
			//var _tmpDate1 = new Date(retrieveddatemax);

			for (var i=0; i<options.properties.retrievedDateCache.length;i++) {
				var diff = options.properties.retrievedDateCache[i].retrievedDateDate.getTime() - new Date(options.properties.retrievedDateMax).getTime();
				if (diff > -240000 && diff < 240000) {  //less than 4min = hit
					options.properties.retrievedDateMax = options.properties.retrievedDateCache[i].retrievedDate;
					//console.log('retrieveddate (cache/hit): ' + retrievedDateMax + ' '+options.retrievedDateMax);
					window.setTimeout(function(){
						layer.clearLayers();
						layer.addData(options.properties.retrievedDateCache[i].data);
						layer.layerControl[0].setActiveDateTime(options.properties.retrievedDateMax, '(cache)');  //timeSliderCtrl
						if (options.next) {
							var _newDate = new Date(new Date(options.properties.retrievedDateMax).getTime()+ 300000);  // +50 minutes for next measure, no need for extra marge here
							//console.log('retrieveddate next : ' + _newDate.toISOString());
							playSliderMovie(layer, _newDate, options.properties.avgType);
						}
					}, 100);
					return;
				}
			}

			var retrievedDatePlusMargeIso = new Date(new Date(options.properties.retrievedDateMax).getTime()+60000).toISOString();

//			ajaxGetData(APRI.getConfig().urlSystemRoot +
			ajaxGetData( siteAireas +
				 "/data/aireas/getGridApriSensorInfo/*?avgdatetimemax=" +
				 retrievedDatePlusMargeIso + '&avgType=' + options.properties.avgType + '&areaCode=' + options.properties.areaCode,
				function(data) {
					var _data = JSON.parse(data);
					if (_data.length == 0 ) return;
					var _retrievedDate = _data[0].properties.avg_datetime; //retrieveddate;

					var _retrievedDateCacheRecord={};
					_retrievedDateCacheRecord.data = _data;
					_retrievedDateCacheRecord.retrievedDate = _retrievedDate;
					_retrievedDateCacheRecord.retrievedDateDate = new Date(_retrievedDate);
					options.properties.retrievedDateCache.push(_retrievedDateCacheRecord);  // store in cache
					//console.log('retrieveddate (new cache): ' + _retrievedDate);
					options.properties.retrievedDateMax = _retrievedDate;  // set retrieveddate to latest read date

					if (options.properties.timeSpan == undefined) {
						// calculate timespan for timeslider correction to the last retrieveable date instead of current date
						var a = new Date();
						var b = new Date(_retrievedDate);
						var _timeSpan = a.getTime() - b.getTime();
						options.properties.timeSpan = _timeSpan;
					}


//					retrievedDateMax = _retrievedDate; //_retrievedDate?_retrievedDate:options.retrievedDateMax;
					layer.clearLayers();
					layer.addData(_data);
					layer.layerControl[0].setActiveDateTime(_retrievedDateCacheRecord.retrievedDateDate, '(db)'); //timeSliderCtrl

					if (options.next) {
						var _newDate = new Date(new Date(options.properties.retrievedDateMax).getTime()+ 300000);  // +5 minutes for next measure, no need for extra marge here
						//console.log('retrieveddate next : ' + _newDate.toISOString());
						window.setTimeout(function(){
							playSliderMovie(layer, _newDate, options.properties.avgType);
						}, 10);
					}
				}
			)
		}
		}
	}

	layerObjects['luftDatenSofiaLayer'] = {
		type: 'L.geoJson',
		options: {
				layerType:'luftDatenSofiaLayer'
				, properties: {
					retrievedDateCache: []
				}
				, style: function (feature) {
					var color="#000000";
					var fillOpacity = 0.4;
					var cr=0;
					var cy=0;
					var cg=0;
					var r = 0;
					var g = 0;
					var b = 0;
					///var valueRounded = Math.round(feature.properties.avg_pm_all_hr*10)/10;
					var valueRounded = feature.properties.avg_avg; //Math.round(feature.properties.avg_avg*10)/10;

					color = aireasDomainsRanges[feature.properties.avg_type].scale(valueRounded);

					if (valueRounded == 0) {
						fillOpacity = 0.1;
					} else {
						fillOpacity = 0.8 + (valueRounded%2)/10;  // domainGroups ; //0.8;
					}
					if (valueRounded <20) {
						fillOpacity -= 0.5;
					}

					var opacity = 0.1; //line opacity

        			return {color: '#888', opacity:opacity, weight:1, fillColor:color, fillOpacity:fillOpacity};
    			}
				, onEachFeature:onEachLuftDatenGridFeature
				, pointToLayer: function (feature, latlng) {
					return L.marker(latlng, { icon: trainIcon} );
				}
				, loadData: function(layer, options) {
			//var _tmpDate1 = new Date(retrieveddatemax);

			for (var i=0; i<options.properties.retrievedDateCache.length;i++) {
				var diff = options.properties.retrievedDateCache[i].retrievedDateDate.getTime() - new Date(options.properties.retrievedDateMax).getTime();
				if (diff > -240000 && diff < 240000) {  //less than 4min = hit
					options.properties.retrievedDateMax = options.properties.retrievedDateCache[i].retrievedDate;
					//console.log('retrieveddate (cache/hit): ' + retrievedDateMax + ' '+options.retrievedDateMax);
					window.setTimeout(function(){
						layer.clearLayers();
						layer.addData(options.properties.retrievedDateCache[i].data);
						layer.layerControl[0].setActiveDateTime(options.properties.retrievedDateMax, '(cache)');  //timeSliderCtrl
						if (options.next) {
							var _newDate = new Date(new Date(options.properties.retrievedDateMax).getTime()+ 300000);  // +50 minutes for next measure, no need for extra marge here
							//console.log('retrieveddate next : ' + _newDate.toISOString());
							playSliderMovie(layer, _newDate, options.properties.avgType);
						}
					}, 100);
					return;
				}
			}

			var retrievedDatePlusMargeIso = new Date(new Date(options.properties.retrievedDateMax).getTime()+60000).toISOString();

//			ajaxGetData(APRI.getConfig().urlSystemRoot +
			ajaxGetData( siteAireas +
				 "/data/aireas/getGridApriSensorInfo/*?avgdatetimemax=" +
				 retrievedDatePlusMargeIso + '&avgType=' + options.properties.avgType + '&areaCode=' + options.properties.areaCode,
				function(data) {
					var _data = JSON.parse(data);
					if (_data.length == 0 ) return;
					var _retrievedDate = _data[0].properties.avg_datetime; //retrieveddate;

					var _retrievedDateCacheRecord={};
					_retrievedDateCacheRecord.data = _data;
					_retrievedDateCacheRecord.retrievedDate = _retrievedDate;
					_retrievedDateCacheRecord.retrievedDateDate = new Date(_retrievedDate);
					options.properties.retrievedDateCache.push(_retrievedDateCacheRecord);  // store in cache
					//console.log('retrieveddate (new cache): ' + _retrievedDate);
					options.properties.retrievedDateMax = _retrievedDate;  // set retrieveddate to latest read date

					if (options.properties.timeSpan == undefined) {
						// calculate timespan for timeslider correction to the last retrieveable date instead of current date
						var a = new Date();
						var b = new Date(_retrievedDate);
						var _timeSpan = a.getTime() - b.getTime();
						options.properties.timeSpan = _timeSpan;
					}


//					retrievedDateMax = _retrievedDate; //_retrievedDate?_retrievedDate:options.retrievedDateMax;
					layer.clearLayers();
					layer.addData(_data);
					layer.layerControl[0].setActiveDateTime(_retrievedDateCacheRecord.retrievedDateDate, '(db)'); //timeSliderCtrl

					if (options.next) {
						var _newDate = new Date(new Date(options.properties.retrievedDateMax).getTime()+ 300000);  // +5 minutes for next measure, no need for extra marge here
						//console.log('retrieveddate next : ' + _newDate.toISOString());
						window.setTimeout(function(){
							playSliderMovie(layer, _newDate, options.properties.avgType);
						}, 10);
					}
				}
			)
		}
		}
	}

	layerObjects['luftDatenAntwerpenLayer'] = {
		type: 'L.geoJson',
		options: {
				layerType:'luftDatenAntwerpenLayer'
				, properties: {
					retrievedDateCache: []
				}
				, style: function (feature) {
					var color="#000000";
					var fillOpacity = 0.4;
					var cr=0;
					var cy=0;
					var cg=0;
					var r = 0;
					var g = 0;
					var b = 0;
					///var valueRounded = Math.round(feature.properties.avg_pm_all_hr*10)/10;
					var valueRounded = feature.properties.avg_avg; //Math.round(feature.properties.avg_avg*10)/10;

					color = aireasDomainsRanges[feature.properties.avg_type].scale(valueRounded);

					if (valueRounded == 0) {
						fillOpacity = 0.1;
					} else {
						fillOpacity = 0.8 + (valueRounded%2)/10;  // domainGroups ; //0.8;
					}
					if (valueRounded <20) {
						fillOpacity -= 0.5;
					}

					var opacity = 0.1; //line opacity

        			return {color: '#888', opacity:opacity, weight:1, fillColor:color, fillOpacity:fillOpacity};
    			}
				, onEachFeature:onEachLuftDatenGridFeature
				, pointToLayer: function (feature, latlng) {
					return L.marker(latlng, { icon: trainIcon} );
				}
				, loadData: function(layer, options) {
			//var _tmpDate1 = new Date(retrieveddatemax);

			for (var i=0; i<options.properties.retrievedDateCache.length;i++) {
				var diff = options.properties.retrievedDateCache[i].retrievedDateDate.getTime() - new Date(options.properties.retrievedDateMax).getTime();
				if (diff > -240000 && diff < 240000) {  //less than 4min = hit
					options.properties.retrievedDateMax = options.properties.retrievedDateCache[i].retrievedDate;
					//console.log('retrieveddate (cache/hit): ' + retrievedDateMax + ' '+options.retrievedDateMax);
					window.setTimeout(function(){
						layer.clearLayers();
						layer.addData(options.properties.retrievedDateCache[i].data);
						layer.layerControl[0].setActiveDateTime(options.properties.retrievedDateMax, '(cache)');  //timeSliderCtrl
						if (options.next) {
							var _newDate = new Date(new Date(options.properties.retrievedDateMax).getTime()+ 300000);  // +50 minutes for next measure, no need for extra marge here
							//console.log('retrieveddate next : ' + _newDate.toISOString());
							playSliderMovie(layer, _newDate, options.properties.avgType);
						}
					}, 100);
					return;
				}
			}

			var retrievedDatePlusMargeIso = new Date(new Date(options.properties.retrievedDateMax).getTime()+60000).toISOString();

//			ajaxGetData(APRI.getConfig().urlSystemRoot +
			ajaxGetData( siteAireas +
				 "/data/aireas/getGridApriSensorInfo/*?avgdatetimemax=" +
				 retrievedDatePlusMargeIso + '&avgType=' + options.properties.avgType + '&areaCode=' + options.properties.areaCode,
				function(data) {
					var _data = JSON.parse(data);
					if (_data.length == 0 ) return;
					var _retrievedDate = _data[0].properties.avg_datetime; //retrieveddate;

					var _retrievedDateCacheRecord={};
					_retrievedDateCacheRecord.data = _data;
					_retrievedDateCacheRecord.retrievedDate = _retrievedDate;
					_retrievedDateCacheRecord.retrievedDateDate = new Date(_retrievedDate);
					options.properties.retrievedDateCache.push(_retrievedDateCacheRecord);  // store in cache
					//console.log('retrieveddate (new cache): ' + _retrievedDate);
					options.properties.retrievedDateMax = _retrievedDate;  // set retrieveddate to latest read date

					if (options.properties.timeSpan == undefined) {
						// calculate timespan for timeslider correction to the last retrieveable date instead of current date
						var a = new Date();
						var b = new Date(_retrievedDate);
						var _timeSpan = a.getTime() - b.getTime();
						options.properties.timeSpan = _timeSpan;
					}


//					retrievedDateMax = _retrievedDate; //_retrievedDate?_retrievedDate:options.retrievedDateMax;
					layer.clearLayers();
					layer.addData(_data);
					layer.layerControl[0].setActiveDateTime(_retrievedDateCacheRecord.retrievedDateDate, '(db)'); //timeSliderCtrl

					if (options.next) {
						var _newDate = new Date(new Date(options.properties.retrievedDateMax).getTime()+ 300000);  // +5 minutes for next measure, no need for extra marge here
						//console.log('retrieveddate next : ' + _newDate.toISOString());
						window.setTimeout(function(){
							playSliderMovie(layer, _newDate, options.properties.avgType);
						}, 10);
					}
				}
			)
		}
		}
	}

  layerObjects['luftDatenLeuvenLayer'] = {
		type: 'L.geoJson',
		options: {
				layerType:'luftDatenLeuvenLayer'
				, properties: {
					retrievedDateCache: []
				}
				, style: function (feature) {
					var color="#000000";
					var fillOpacity = 0.4;
					var cr=0;
					var cy=0;
					var cg=0;
					var r = 0;
					var g = 0;
					var b = 0;
					///var valueRounded = Math.round(feature.properties.avg_pm_all_hr*10)/10;
					var valueRounded = feature.properties.avg_avg; //Math.round(feature.properties.avg_avg*10)/10;

					color = aireasDomainsRanges[feature.properties.avg_type].scale(valueRounded);

					if (valueRounded == 0) {
						fillOpacity = 0.1;
					} else {
						fillOpacity = 0.8 + (valueRounded%2)/10;  // domainGroups ; //0.8;
					}
					if (valueRounded <20) {
						fillOpacity -= 0.5;
					}

					var opacity = 0.1; //line opacity

        			return {color: '#888', opacity:opacity, weight:1, fillColor:color, fillOpacity:fillOpacity};
    			}
				, onEachFeature:onEachLuftDatenGridFeature
				, pointToLayer: function (feature, latlng) {
					return L.marker(latlng, { icon: trainIcon} );
				}
				, loadData: function(layer, options) {
			//var _tmpDate1 = new Date(retrieveddatemax);

			for (var i=0; i<options.properties.retrievedDateCache.length;i++) {
				var diff = options.properties.retrievedDateCache[i].retrievedDateDate.getTime() - new Date(options.properties.retrievedDateMax).getTime();
				if (diff > -240000 && diff < 240000) {  //less than 4min = hit
					options.properties.retrievedDateMax = options.properties.retrievedDateCache[i].retrievedDate;
					//console.log('retrieveddate (cache/hit): ' + retrievedDateMax + ' '+options.retrievedDateMax);
					window.setTimeout(function(){
						layer.clearLayers();
						layer.addData(options.properties.retrievedDateCache[i].data);
						layer.layerControl[0].setActiveDateTime(options.properties.retrievedDateMax, '(cache)');  //timeSliderCtrl
						if (options.next) {
							var _newDate = new Date(new Date(options.properties.retrievedDateMax).getTime()+ 300000);  // +50 minutes for next measure, no need for extra marge here
							//console.log('retrieveddate next : ' + _newDate.toISOString());
							playSliderMovie(layer, _newDate, options.properties.avgType);
						}
					}, 100);
					return;
				}
			}

			var retrievedDatePlusMargeIso = new Date(new Date(options.properties.retrievedDateMax).getTime()+60000).toISOString();

//			ajaxGetData(APRI.getConfig().urlSystemRoot +
			ajaxGetData( siteAireas +
				 "/data/aireas/getGridApriSensorInfo/*?avgdatetimemax=" +
				 retrievedDatePlusMargeIso + '&avgType=' + options.properties.avgType + '&areaCode=' + options.properties.areaCode,
				function(data) {
					var _data = JSON.parse(data);
					if (_data.length == 0 ) return;
					var _retrievedDate = _data[0].properties.avg_datetime; //retrieveddate;

					var _retrievedDateCacheRecord={};
					_retrievedDateCacheRecord.data = _data;
					_retrievedDateCacheRecord.retrievedDate = _retrievedDate;
					_retrievedDateCacheRecord.retrievedDateDate = new Date(_retrievedDate);
					options.properties.retrievedDateCache.push(_retrievedDateCacheRecord);  // store in cache
					//console.log('retrieveddate (new cache): ' + _retrievedDate);
					options.properties.retrievedDateMax = _retrievedDate;  // set retrieveddate to latest read date

					if (options.properties.timeSpan == undefined) {
						// calculate timespan for timeslider correction to the last retrieveable date instead of current date
						var a = new Date();
						var b = new Date(_retrievedDate);
						var _timeSpan = a.getTime() - b.getTime();
						options.properties.timeSpan = _timeSpan;
					}


//					retrievedDateMax = _retrievedDate; //_retrievedDate?_retrievedDate:options.retrievedDateMax;
					layer.clearLayers();
					layer.addData(_data);
					layer.layerControl[0].setActiveDateTime(_retrievedDateCacheRecord.retrievedDateDate, '(db)'); //timeSliderCtrl

					if (options.next) {
						var _newDate = new Date(new Date(options.properties.retrievedDateMax).getTime()+ 300000);  // +5 minutes for next measure, no need for extra marge here
						//console.log('retrieveddate next : ' + _newDate.toISOString());
						window.setTimeout(function(){
							playSliderMovie(layer, _newDate, options.properties.avgType);
						}, 10);
					}
				}
			)
		}
		}
	}





	layerObjects['heatmapTrafficFlowLayer'] = {
		type: 'L.heatLayer',
		options: {
				  layerType:'heatmapTrafficFlowLayer'
				, name: 'Trafficflow heatmap'
				, properties: {
					retrievedDateCache: []
				}
				, trafficFlowUrl: "https://openiod.org/SCAPE604/openiod?SERVICE=WPS&REQUEST=Execute&identifier=NDW_trafficSpeed&location="+currentAreaCode+"&valueType=traffic&format=json"
				//, heatmapOptions: {
				,      radius: 15, blur:10, max:1
				    , gradient: {0.4: 'blue', 0.6: 'cyan', 0.7: 'lime', 0.8: 'yellow', 1: 'red'}
				    , loadTrafficData: "FLOW"
					, layerType:'heatmapTrafficFlowLayer'
					, loadDataTrafficFlowLayer: this.loadData //loadDataTrafficFlowLayer
					, waitFirstTime: 1000  // extra wait for map is initialized
					, activate:true
					, refreshData: true
				//}
			//	, refreshData: true
				, loadData: function(layer, options) {
			//var _tmpDate1 = new Date(retrieveddatemax);

			for (var i=0; i<options.properties.retrievedDateCache.length;i++) {
				var diff = options.properties.retrievedDateCache[i].retrievedDateDate.getTime() - new Date(options.properties.retrievedDateMax).getTime();
				if (diff > -480000 && diff < 480000) {  //less than 9min = hit
					options.properties.retrievedDateMax = options.properties.retrievedDateCache[i].retrievedDate;
					//console.log('retrieveddate (cache/hit): ' + retrievedDateMax + ' '+options.retrievedDateMax);
					window.setTimeout(function(){
						//layer.clearLayers();
						//layer.addData(options.properties.retrievedDateCache[i].data);
						layer.setLatLngs(options.properties.retrievedDateCache[i].trafficFlowDataRecords);
						layer.layerControl[0].setActiveDateTime(options.properties.retrievedDateMax, '(cache)');  //timeSliderCtrl
						if (options.next) {
							var _newDate = new Date(new Date(options.properties.retrievedDateMax).getTime()+ 600000);  // +10 minutes for next measure, no need for extra marge here
							//console.log('retrieveddate next : ' + _newDate.toISOString());
							playSliderMovie(layer, _newDate, options.name);
						}
					}, 400);
					return;
				}
			}

			var retrievedDatePlusMargeIso = new Date(new Date(options.properties.retrievedDateMax).getTime()+60000).toISOString();

			var _trafficFlowUrl = options.trafficFlowUrl + "&maxRetrievedDate="+retrievedDatePlusMargeIso;

//			ajaxGetData(APRI.getConfig().urlSystemRoot +
			ajaxGetData( _trafficFlowUrl ,
				function(data) {
					var _data = JSON.parse(data);
					if (_data.length == 0 ) return;
					var _retrievedDate = _data[0].properties.site.retrievedDate;

					var _retrievedDateCacheRecord={};
					_retrievedDateCacheRecord.data = _data;
					_retrievedDateCacheRecord.retrievedDate = _retrievedDate;
					_retrievedDateCacheRecord.retrievedDateDate = new Date(_retrievedDate);


					var trafficFlowDataRecords= [];
					for (var i=0;i<_data.length;i++) {
						var _record = _data[i];
						//var _retrievedDateTime = new Date(_record.properties.site.retrievedDate).getTime();
						//var _diff = _retrievedDateTime - retrievedDateMaxTrafficFlow.getTime();
						//if (_diff> 90000 || _diff< -90000 ) continue;

						if (_data[i].properties.site.id == 'GEO01_SRETI002' ) continue; // strange (high) values for traffic flow
						var inpRecord = _data[i];
						if (inpRecord.properties.trafficFlow == undefined ) continue; // No measurements for this site
						var _trafficFlowDataRecord = [];
						_trafficFlowDataRecord[0] = inpRecord.geometry.coordinates[1];
						_trafficFlowDataRecord[1] = inpRecord.geometry.coordinates[0];
						//_verbruikDataRecordGAS.alt = inpRecordGas.SJV*0.001;
						_trafficFlowDataRecord.alt = inpRecord.properties.trafficFlow.total/200;
						// inpRecordGas.aantalAanslDef
						trafficFlowDataRecords.push(_trafficFlowDataRecord);
					}
					//heatmapTrafficFlowLayer.setLatLngs(trafficFlowDataRecords);
					layer.setLatLngs(trafficFlowDataRecords);
					_retrievedDateCacheRecord.trafficFlowDataRecords = trafficFlowDataRecords;
					//retrievedDateCacheTrafficFlow.push(_retrievedDateCacheRecord);  // store in cache

					options.properties.retrievedDateCache.push(_retrievedDateCacheRecord);  // store in cache
					//console.log('retrieveddate (new cache): ' + _retrievedDate);


//					retrievedDateMax = _retrievedDate; //_retrievedDate?_retrievedDate:options.retrievedDateMax;
//					layer.clearLayers();
//					layer.addData(_data);

					layer.layerControl[0].setActiveDateTime(_retrievedDateCacheRecord.retrievedDateDate, '(db)'); //timeSliderCtrl


					if (options.next) {
						var _newDate = new Date(new Date(options.properties.retrievedDateMax).getTime()+ 600000);  // +10 minutes for next measure, no need for extra marge here
						//console.log('retrieveddate next : ' + _newDate.toISOString());
						window.setTimeout(function(){
							playSliderMovie(layer, _newDate, options.name);
						}, 100);
					}
				}
			)
		}
	}
	}





	var layerClasses = {};

	var areaLayerPackages = {
		'aireas': [
			{layer:{name:'aireasGridGemLayer',			layerObjectName: 'aireasGridGemLayer'},	group: 'AiREAS', sortId: 1, sensor: 'UFP', 	label:'Sensor UFP', properties: {avgType:'UFP'} },
			{layer:{name:'aireasGridGemLayer1',			layerObjectName: 'aireasGridGemLayer'},	group: 'AiREAS', sortId: 1, sensor: 'PM1', 	label:'Sensor PM1', properties: {avgType:'PM1'} },
			{layer:{name:'aireasGridGemLayer2',			layerObjectName: 'aireasGridGemLayer'},	group: 'AiREAS', sortId: 1, sensor: 'PM25', label:'Sensor PM2.5', properties: {avgType:'PM25'} },
			{layer:{name:'aireasGridGemLayer3',			layerObjectName: 'aireasGridGemLayer'},	group: 'AiREAS', sortId: 1, sensor: 'PM10', label:'Sensor PM10', properties: {avgType:'PM10'} },
			{layer:{name:'aireasGridGemLayer4',			layerObjectName: 'aireasGridGemLayer'},	group: 'AiREAS', sortId: 1, sensor: 'NO2', 	label:'Sensor NO2', properties: {avgType:'NO2'} },
			{layer:{name:'aireasGridGemLayer5',			layerObjectName: 'aireasGridGemLayer'},	group: 'AiREAS', sortId: 1, sensor: 'OZON', label:'Sensor OZON', properties: {avgType:'OZON'} },
			{layer:{name:'aireasGridGemLayer6',			layerObjectName: 'aireasGridGemLayer'},	group: 'AiREAS', sortId: 1, sensor: 'HUM', 	label:'Sensor Hum', properties: {avgType:'HUM'} },
			{layer:{name:'aireasGridGemLayer7',			layerObjectName: 'aireasGridGemLayer'},	group: 'AiREAS', sortId: 1, sensor: 'CELC', label:'Sensor Celc', properties: {avgType:'CELC'} },
			{layer:{name:'aireasTileLayer',				layerObjectName: 'aireasGridGemLayer'},	group: 'AiREAS', sortId: 1, label:'Tilelayer' },
			{layer:{name:'aireasMeetkastenLayer',			layerObjectName: 'aireasMeetkastenLayer'},	group: 'AiREAS', sortId: 1, label:'Airboxen' },
			{layer:{name:'aireasWMSPuntMetingenLayer',	layerObjectName: 'aireasGridGemLayer'},	group: 'AiREAS', sortId: 1, label:'Puntmetingen' },
			{layer:{name:'aireasGridGemStatisticsLayer',	layerObjectName: 'aireasGridGemLayer'},	group: 'AiREAS', sortId: 1, label:'Statistiek' },
			{layer:{name:'aireasGridGemStatisticsAvgLayer',layerObjectName: 'aireasGridGemLayer'},	group: 'AiREAS', sortId: 1, label:'Statistiek gem.' }
		],
		'cbs': [
			{layer:{name:'cbsGridGemLayer',			layerObjectName: 'cbsGridGemLayer'},	group: 'CBS', sortId: 1, 	label:'CBS gemeente grenzen'}
			,{layer:{name:'cbsGridGemEnvelopeLayer',			layerObjectName: 'cbsGridGemEnvelopeLayer'},	group: 'CBS', sortId: 1, 	label:'CBS gemeente grenzen rechthoek'}
//			'cbsGridGemLayer':				{group: 'CBS', sortId: 1 },
//			'cbsGridGemEnvelopeLayer':		{group: 'CBS', sortId: 1 },
//			'cbsBuurtInfoLayer':			{group: 'CBS', sortId: 1 },
//			'cbsBuurtRookRisicoInfoLayer':	{group: 'CBS', sortId: 1 }
		],
		'wat': [
			{layer:{name:'waterschapGrenzenLayer',	layerObjectName: 'waterschapGrenzenLayer'},	group: 'WAT', sortId: 1, 	label:'Waterschapsgrenzen'}
			,{layer:{name:'bijenGifLayer',			layerObjectName: 'bijenGifLayer'},	group: 'WAT', sortId: 1, 	label:'Bijengif'}
			,{layer:{name:'pestInfoStofKentallen',	layerObjectName: 'pestInfoStofKentallen'},	group: 'WAT', sortId: 1, 	label:'Kentallen'}
		],
		'ndw': [
			{layer:{name:'ndwTrafficFlowLayer',			layerObjectName: 'ndwTrafficFlowLayer'},		group: 'NDW', sortId: 1, 	label:'Trafficflow'}
			,{layer:{name:'ndwTrafficSpeedLayer',		layerObjectName: 'ndwTrafficSpeedLayer'},		group: 'NDW', sortId: 1, 	label:'Trafficspeed'}
			,{layer:{name:'ndwTrafficSpeedLayerTest',	layerObjectName: 'ndwTrafficSpeedLayerTest'},	group: 'NDW', sortId: 1, 	label:'Trafficspeed test'}
			,{layer:{name:'heatmapTrafficFlowLayer',	layerObjectName: 'heatmapTrafficFlowLayer'},	group: 'NDW', sortId: 1, 	label:'Trafficflow heatmap'}
			,{layer:{name:'heatmapTrafficSpeedLayer',	layerObjectName: 'heatmapTrafficSpeedLayer'},	group: 'NDW', sortId: 1, 	label:'Trafficspeed heatmap'}
			//'ndwTrafficFlowLayer':			{group: 'NDW', sortId: 1, loadData:'loadDataTrafficFlowLayer'},
			//'ndwTrafficSpeedLayer':			{group: 'NDW', sortId: 1 },
			//'ndwTrafficSpeedLayerTest':		{group: 'NDW', sortId: 1 },
			//'heatmapTrafficFlowLayer':		{group: 'NDW', sortId: 1 }
			//'heatmapTrafficSpeedLayer':		{group: 'NDW', sortId: 1 }
		],
		'luftdaten': [
			{layer:{name:'luftDatenEurSmallLayer',			layerObjectName: 'luftDatenEurSmallLayer'},		group: 'LUFTD', sortId: 1,sensor: 'SDS011_PM25', 	label:'Luftdaten PM2.5', properties: {areaCode: 'LDEUR20170901:1', avgType:'SDS011_PM25'}},
			{layer:{name:'luftDatenStuttgartLayer',			layerObjectName: 'luftDatenStuttgartLayer'},		group: 'LUFTD', sortId: 1,sensor: 'SDS011_PM25', 	label:'Luftdaten Stuttgart PM2.5', properties: {areaCode: 'LDSTU20171022:1', avgType:'SDS011_PM25'}},
			{layer:{name:'luftDatenSofiaLayer',			layerObjectName: 'luftDatenSofiaLayer'},		group: 'LUFTD', sortId: 1,sensor: 'SDS011_PM25', 	label:'Luftdaten Sofia PM2.5', properties: {areaCode: 'LDSOF20171027:1', avgType:'SDS011_PM25'}},
			{layer:{name:'luftDatenAntwerpenLayer',			layerObjectName: 'luftDatenAntwerpenLayer'},		group: 'LUFTD', sortId: 1,sensor: 'SDS011_PM25', 	label:'Luftdaten Antwerpen PM2.5', properties: {areaCode: 'LDANT20180601:1', avgType:'SDS011_PM25'}},
      {layer:{name:'luftDatenLeuvenLayer',			layerObjectName: 'luftDatenLeuvenLayer'},		group: 'LUFTD', sortId: 1,sensor: 'SDS011_PM25', 	label:'Luftdaten Leuven PM2.5', properties: {areaCode: 'LDLEU20180601:1', avgType:'SDS011_PM25'}}
		],
		'nsl': {
			'nslSegmentEindhovenWMSLayer':		{group: 'NSL', sortId: 1 }, 
			'nslResultEindhovenWMSLayer':		{group: 'NSL', sortId: 1 },
			'nslReceptorEindhovenWMSLayer':		{group: 'NSL', sortId: 1 },
			'nslMeasureEindhovenWMSLayer':		{group: 'NSL', sortId: 1 },
			'nslMeasuresInfoLayer':				{group: 'NSL', sortId: 1 },
			'nslResultInfoLayer':				{group: 'NSL', sortId: 1 },
			'nslResultSpmiAvgInfoLayer':		{group: 'NSL', sortId: 1 }
		},
		'wur': {
			'dankPm10InvangWMSLayer':			{group: 'WUR', sortId: 1 },
			'dankWandelWMSLayer':				{group: 'WUR', sortId: 1 },
			'dankFietsWMSLayer':				{group: 'WUR', sortId: 1 },
			'dankLandBelevingWMSLayer':			{group: 'WUR', sortId: 1 },
			'dankBodemMaatregelCTotaalWMSLayer':{group: 'WUR', sortId: 1 },
			'dankBomenWMSLayer':				{group: 'WUR', sortId: 1 },
			'dankBiomassaHoutvoorraadWMSLayer':	{group: 'WUR', sortId: 1 },
			'dankBoomHoogteWMSLayer':			{group: 'WUR', sortId: 1 },
			'dankBiomassaTakTopSnoeiWMSLayer':	{group: 'WUR', sortId: 1 },
			'dankWarmteDalingWMSLayer':			{group: 'WUR', sortId: 1 }
		},
		'ov': {
			'ovStopsWMSLayer':					{group: 'OV', sortId: 1 },
			'ovShapesWMSLayer':					{group: 'OV', sortId: 1 },
			'gtfsStopsInRangeInfoLayer':		{group: 'OV', sortId: 1 },
			'nsStationsLayer':					{group: 'OV', sortId: 1 }
		},
		'divers': {
			'openBasisKaartLayer':				{group: 'DIV', sortId: 1 },
			'osmKaartLayer':					{group: 'DIV', sortId: 1 },
			'cbsGridGemEnvelopeLayer':			{group: 'DIV', sortId: 1 },
			'PDOK_BAG_pand_Layer':				{group: 'DIV', sortId: 1 },
			'PDOK_BAG_verblijfsobject_Layer':	{group: 'DIV', sortId: 1 },
			'pdokLuchtfotoLayer':				{group: 'DIV', sortId: 1 },
			'projectAirportLayer':				{group: 'DIV', sortId: 1 },
			'bioMassaCentraleEindhovenLayer':	{group: 'DIV', sortId: 1 },
			'videoCameraLayer':					{group: 'DIV', sortId: 1 },
			'participationLayer':				{group: 'DIV', sortId: 1 },
			'solutionsLayer':					{group: 'DIV', sortId: 1 },
			'parkingLayer':						{group: 'DIV', sortId: 1 },
			'localProductsLayer':				{group: 'DIV', sortId: 1 },
			'aardbevingenLocationsLayer':		{group: 'DIV', sortId: 1 },
			'Ahn1_5m_Layer':					{group: 'DIV', sortId: 1 },
			'droneNoFlyZoneLandingsiteLayer':	{group: 'DIV', sortId: 1 },
			'droneNoFlyZoneLayerLuchtvaart':	{group: 'DIV', sortId: 1 },
			'KNMI_Layer':						{group: 'DIV', sortId: 1 },
			'EnkelbestemmingLayer':				{group: 'DIV', sortId: 1 },
			'DubbelbestemmingLayer':			{group: 'DIV', sortId: 1 },
			'BestemmingsplangebiedLayer':		{group: 'DIV', sortId: 1 },
			'BouwvlakLayer':					{group: 'DIV', sortId: 1 },
			'GebiedsaanduidingLayer':			{group: 'DIV', sortId: 1 },
			'Structuurvisieplangebied_G_Layer':	{group: 'DIV', sortId: 1 },
			'nwbWegHectoPuntenLayer':			{group: 'DIV', sortId: 1 },
			'nwbWegVakkenLayer':				{group: 'DIV', sortId: 1 }
		},
		'ehv': [
			{layer:{name:'EHV_OplaadPalen_Layer',			layerObjectName: 'EHV_OplaadPalen_Layer'},			group: 'EHV', sortId: 1, label:'Oplaadpalen', properties: {} },
			{layer:{name:'EHV_BeeldBepalendGroen_Layer',	layerObjectName: 'EHV_BeeldBepalendGroen_Layer'},	group: 'EHV', sortId: 1, label:'Beeld bep. groen', properties: {} },
			{layer:{name:'EHV_Bomen_Layer',					layerObjectName: 'EHV_Bomen_Layer'},				group: 'EHV', sortId: 1, label:'Bomen', properties: {} },
			{layer:{name:'EHV_Luchtkwaliteit_Layer',		layerObjectName: 'EHV_Luchtkwaliteit_Layer'},		group: 'EHV', sortId: 1, label:'Luchtkwaliteit', properties: {} },
			{layer:{name:'EHV_FaunaPoelen_Layer',			layerObjectName: 'EHV_FaunaPoelen_Layer'},			group: 'EHV', sortId: 1, label:'Faunapoelen', properties: {} },
			{layer:{name:'EHV_Landschap_Layer',				layerObjectName: 'EHV_Landschap_Layer'},			group: 'EHV', sortId: 1, label:'Landschap', properties: {} },
			{layer:{name:'EHV_StedebouwkundigGebied_Layer',	layerObjectName: 'EHV_StedebouwkundigGebied_Layer'},	group: 'EHV', sortId: 1, label:'stedebouwkundiggebied', properties: {} },
			{layer:{name:'EHV_Wegenstructuur_Layer',		layerObjectName: 'EHV_Wegenstructuur_Layer'},		group: 'EHV', sortId: 1, label:'Wegenstructuur', properties: {} },
			{layer:{name:'EHV_Vergunningen_Layer',			layerObjectName: 'EHV_Vergunningen_Layer'},			group: 'EHV', sortId: 1, label:'Vergunningen', properties: {} },
			{layer:{name:'EHV_Lichtmasten_Layer',			layerObjectName: 'EHV_Lichtmasten_Layer'},			group: 'EHV', sortId: 1, label:'Lichtmasten', properties: {} }
/*			,
			'EHV_OplaadPalen_Layer':			{group: 'EHV', sortId: 1 },
			'EHV_BeeldBepalendGroen_Layer':		{group: 'EHV', sortId: 1 },
			'EHV_Bomen_Layer':					{group: 'EHV', sortId: 1 },
			'EHV_Luchtkwaliteit_Layer':			{group: 'EHV', sortId: 1 },
			'EHV_FaunaPoelen_Layer':			{group: 'EHV', sortId: 1 },
			'EHV_Landschap_Layer':				{group: 'EHV', sortId: 1 },
			'EHV_StedebouwkundigGebied_Layer':	{group: 'EHV', sortId: 1 },
			'EHV_Wegenstructuur_Layer':			{group: 'EHV', sortId: 1 },
			'EHV_Vergunningen_Layer':			{group: 'EHV', sortId: 1 },
			'EHV_Lichtmasten_Layer':			{group: 'EHV', sortId: 1 }
*/
		],
		'rtd': {
			'RTD_Spelen_Layer':					{group: 'RTD', sortId: 1 },
			'RTD_SpeelPlaatsen_Layer':			{group: 'RTD', sortId: 1 },
			'RTD_BROnderhoud_Layer':			{group: 'RTD', sortId: 1 },
			'RTD_Bomen_Layer':					{group: 'RTD', sortId: 1 },
			'RTD_BouwPlaatsen_Layer':			{group: 'RTD', sortId: 1 },
			'RTD_Verkeersborden_Layer':			{group: 'RTD', sortId: 1 },
			'RTD_StrNaamBorden_Layer':			{group: 'RTD', sortId: 1 },
			'RTD_Plantsoenen_Layer':			{group: 'RTD', sortId: 1 },
			'RTD_Lichtmasten_Layer':			{group: 'RTD', sortId: 1 }
		},
		'arh': {
			'ARH_Bossen_Layer':					{group: 'ARNHEM', sortId: 1 },
			'ARH_Tuinen_Layer':					{group: 'ARNHEM', sortId: 1 },
			'ARH_Parken_Layer':					{group: 'ARNHEM', sortId: 1 },
			'ARH_BomenWVControle_Layer':		{group: 'ARNHEM', sortId: 1 },
			'ARH_BomenWVBeschermd_Layer':		{group: 'ARNHEM', sortId: 1 },
			'ARH_BomenWV_Layer':				{group: 'ARNHEM', sortId: 1 },
			'ARH_Restgroen_Layer':				{group: 'ARNHEM', sortId: 1 },
			'ARH_KlimaatZones_Layer':			{group: 'ARNHEM', sortId: 1 },
			'ARH_KlimaatZonesL_Layer':			{group: 'ARNHEM', sortId: 1 },
			'ARH_KlimaatZonesP_Layer':			{group: 'ARNHEM', sortId: 1 },
			'ARH_AfvalKunststof_Layer':			{group: 'ARNHEM', sortId: 1 },
			'ARH_AfvalGlas_Layer':				{group: 'ARNHEM', sortId: 1 },
			'ARH_AfvalRestafval_Layer':			{group: 'ARNHEM', sortId: 1 },
			'ARH_AfvalPapier_Layer':			{group: 'ARNHEM', sortId: 1 },
			'ARH_AfvalTextiel_Layer':			{group: 'ARNHEM', sortId: 1 }
		}
	}

	var areaLayersPackagesList = {
		  'EHV': { layerPackages: {'aireas': true, 'cbs': true, 'wat': true, 'ndw': true, 'luftdaten':true  } } //,	 , 'ehv': true	'ov': true, 'divers': true } }
		, 'HLM': { layerPackages: {'aireas': true,	'ndw': true, 				'ov': true, 'divers': true, 'cbs': true } }
		, 'BRD': { layerPackages: {'aireas': true,	'ndw': true, 			 	'ov': true, 'divers': true, 'cbs': true } }
		, 'RTD': { layerPackages: {					'ndw': true, 'rtd': true, 	'ov': true, 'divers': true, 'cbs': true } }
		, 'ARH': { layerPackages: {					'ndw': true, 'arh': true, 	'ov': true, 'divers': true, 'cbs': true } }
		, 'DLF': { layerPackages: {					'ndw': true, 			 	'ov': true, 'divers': true, 'cbs': true } }
	}

	var cityArea = {
		  'Eindhoven': 	{ cityAreaCode: 'EHV', logoLabel: "Eindhoven", classNames: 'top-logo-container', onClick: areaClick, onMouseEnter: areaLayerMenuMouseEnter, onMouseLeave: areaLayerMenuMouseLeave, onMouseClick:areaClick, logo: { classNames: 'top-logo', src: "../client/apri-client-aireas/logos/Eindhoven.png", alt: "AiREAS Eindhoven" }  }  //aireasLogoClick
		, 'Helmond': 	{ cityAreaCode: 'HLM', logoLabel: "Helmond", classNames: 'top-logo-container', onClick: areaClick, onMouseEnter: areaLayerMenuMouseEnter, onMouseLeave: areaLayerMenuMouseLeave, logo: { classNames: 'top-logo', src: "../client/apri-client-aireas/logos/Helmond.gif", alt: "AiREAS Eindhoven", onClick: null, onMouseEnter: areaLayerMenuMouseEnter, onMouseLeave: areaLayerMenuMouseLeave, onMouseClick:areaClick} }
		, 'Breda': 		{ cityAreaCode: 'BRD', logoLabel: "Breda", classNames: 'top-logo-container', onClick: areaClick, onMouseEnter: areaLayerMenuMouseEnter, onMouseLeave: areaLayerMenuMouseLeave, logo: { classNames: 'top-logo', src: "../client/apri-client-aireas/logos/Breda.jpg", alt: "AiREAS Eindhoven", onClick: null, onMouseEnter: areaLayerMenuMouseEnter, onMouseLeave: areaLayerMenuMouseLeave, onMouseClick:areaClick} }
		, 'Rotterdam': 	{ cityAreaCode: 'RTD', logoLabel: "Rotterdam", classNames: 'top-logo-container', onClick:areaClick }
		, 'Arnhem': 	{ cityAreaCode: 'ARH', logoLabel: "Arnhem", classNames: 'top-logo-container', onClick:areaClick }
		, 'Assen': 		{ cityAreaCode: 'ASS', logoLabel: "Assen", classNames: 'top-logo-container', onClick:areaClick }
		, 'Delft': 		{ cityAreaCode: 'DLF', logoLabel: "Delft", classNames: 'top-logo-container', onClick:areaClick }
	}



	var initArea = function(areaCode, areaIndex) {
		var freeArea = false;

		if (areaIndex) {
			freeArea = true;
			initAreaLayerPackagesList( areaCode, areas[areaIndex] );
		} else {
			for (var i=0;i<maxAreas;i++) {
				if (areas[i].active == true) {

				} else {
					freeArea = true;
					initAreaLayerPackagesList( areaCode, areas[i] );
					break;
				}
			}
		}
	}

	var initAreaLayerPackagesList = function(areaCode, areasArea) {
		areasArea.areaCode = areaCode;
		if (areaLayersPackagesList[areaCode] != undefined ) {
			for (var areaLayerPackageKey in areaLayersPackagesList[areaCode].layerPackages) {
				var _package = areaLayerPackages[areaLayerPackageKey];
				for (var layerKey in _package ) {
					//var _layer = initAreaLayer(_package[layerKey].layer.name);
					var packageLayer = _package[layerKey];
					packageLayer.active = false;
					areasArea.areaLayer[_package[layerKey].layer.name] = packageLayer;
				}
			}
		}
	}

	var initAreaLayer = function(layerKey) {
		var _layer = {};
		_layer.layer 	= layerKey;
		_layer.active 	= false;
		return _layer;
	}

	var getDeepLinkVars = function() {
			var i = 0;
			var parts = window.location.href.replace(/[?&]+([^=&]+)=([^&]*)/gi, function(m,key,value) {
				if (key == 'dltype') return; //future extension eg. for encrypted deeplink variables
				var areaIndChar = key.substr(0,1);
				var areaIndInt;
				var _area, _key;
				if (areaIndChar >= "1" && areaIndChar <= "4" ) {  // area 1, 2, 3 or 4
					areaIndInt 	= parseInt(areaIndChar);
					_key		= key.substr(1);
				} else { // area 0
					areaIndInt 	= 0
					_key 		= key;
				}
				_area 		= areas[areaIndInt].deepLinkVars;

				if (_key == 'layers') {
					_area[_key] = value.split(',');
				} else {
					_area[_key]	= value;
				}

			});

			return;
	};

	var setPushState = function() {
		var _variables = "";
		var _firstVar = true;
		var _areaIndex = "";
		var dltype = "1";	// deeplink type = '1'=standard, future: encoded dltype?
		_variables = _variables + "dltype=" + dltype;
		_firstVar = false;
		for (var i=0;i<areas.length;i++) {
			if (i>0) _areaIndex = "" + i;
			var _areaVars = areas[i].deepLinkVars;
			for ( var key in _areaVars ) {
				if (_firstVar == true) {
					_firstVar = false;
				} else _variables = _variables + '&';

				if (key == 'layers') {
					_variables = _variables + _areaIndex + key + '=';
					var _first = true;
					var _keys = _areaVars[key];
					for (var j=0;j<_keys.length;j++) {
						var _areaVarTmp = _keys[j];
						if (_areaVarTmp != undefined) {
							if (_first == true) {
								_first = false;
							} else {
								_variables = _variables + ',';
							}
							_variables = _variables + _areaVarTmp;
						}
					}
				} else {
					_variables = _variables + _areaIndex + key + '=' + _areaVars[key];
				}
			}
		}
		window.history.pushState({apri:'aireas'}, "aireas", "?" + _variables);
	};

	var checkLayerClass = function(layer) {
//		if (layerClasses[layer.name] == undefined || layerClasses[layer.name].layerClass == undefined) {
		if (layerClasses[layer.name] == undefined || layerClasses[layer.name].createLayerClass == undefined) {
			createLayerClasses(layer);
			//	areas[areaIndex],
		}
//		if (layerClasses[layer.name] == undefined || layerClasses[layer.name].layerClass == undefined) {
		if (layerClasses[layer.name] == undefined || layerClasses[layer.name].createLayerClass == undefined) {
			console.log('Class definition not found for layer '+layer.name );
		}
	}

	function cloneSO(obj)
	{
    // Handle the 3 simple types, and null or undefined
    if (null == obj || "object" != typeof obj) return obj;

    // Handle Date
    if (obj instanceof Date) {
        var copy = new Date();
        copy.setTime(obj.getTime());
        return copy;
    }

    // Handle Array
    if (obj instanceof Array) {
        var copy = [];
        for (var i = 0, len = obj.length; i < len; i++) {
            copy[i] = cloneSO(obj[i]);
        }
        return copy;
    }

    // Handle Object
    if (obj instanceof Object) {
        var copy = {};
        for (var attr in obj) {
            if (obj.hasOwnProperty(attr)) copy[attr] = cloneSO(obj[attr]);
        }
        return copy;
    }

    throw new Error("Unable to copy obj! Its type isn't supported.");
	}

	var createLayerClasses = function(layer) {
	//	if (layer == 'aireasGridGemLayer') {
		// first experimental layer for testing:
		layerClasses[layer.name] = {};
		var layerObject;
		var layerObjectType = layerObjects[layer.layerObjectName].type;

		if (layerObjectType == 'L.geoJson') {
			//var options = layerObjectsDefaults[layerObjectType].options;
			var options = cloneSO(layerObjectsDefaults[layerObjectType].options);
			for (var optionKey in layerObjects[layer.layerObjectName].options) {
				options[optionKey] = cloneSO(layerObjects[layer.layerObjectName].options[optionKey]);
			}
			options.properties = options.properties?options.properties:{};
			layerClasses[layer.name].createLayerClass = function() {
				var layerObject = new L.geoJson(null, options

				);
				return layerObject;

			}
		}

		if (layerObjectType == 'L.heatLayer') {
			var options = cloneSO(layerObjectsDefaults[layerObjectType].options);
			for (var optionKey in layerObjects[layer.layerObjectName].options) {
				options[optionKey] = cloneSO(layerObjects[layer.layerObjectName].options[optionKey]);
			}
			options.properties = options.properties?options.properties:{};
			layerClasses[layer.name].createLayerClass = function() {
				var layerObject = new L.heatLayer([], options); //.heatmapOptions);
				//options.properties.retrievedDateMax = new Date();

				//options.loadData(layerObject,options );  // when activated directly load data
				return layerObject;


			}
		}

		if (layerObjectType == 'wms') {
			var options = cloneSO(layerObjectsDefaults[layerObjectType].options);
			for (var optionKey in layerObjects[layer.layerObjectName].options) {
				options[optionKey] = cloneSO(layerObjects[layer.layerObjectName].options[optionKey]);
			}

			layerClasses[layer.name].createLayerClass = function() {
				var layerObject = new L.tileLayer.wms(layerObjects[layer.layerObjectName].siteProtocol+'://'+layerObjects[layer.layerObjectName].sitePrefixExtern+layerObjects[layer.layerObjectName].url,
					options
				);
				return layerObject;
			}
		}

		if (layerObjectType == 'betterwms') {
			var options = cloneSO(layerObjectsDefaults[layerObjectType].options);
			for (var optionKey in layerObjects[layer.layerObjectName].options) {
				options[optionKey] = cloneSO(layerObjects[layer.layerObjectName].options[optionKey]);
			}

			layerClasses[layer.name].createLayerClass = function() {
				var layerObject = new L.TileLayer.BetterWMS(layerObjects[layer.layerObjectName].siteProtocol+'://'+layerObjects[layer.layerObjectName].sitePrefixExtern+layerObjects[layer.layerObjectName].url,
					options
				);
				return layerObject;
			}
		}


	}


	var activateLayer = function(layer, areaIndex ) {
		var _layer = layer;
		if (areas[areaIndex].areaLayer[layer.name] != undefined ) {
			console.log('Layer %s for area %s is defined. Activating', layer, areaIndex);
			//if (layerClasses[layer] == undefined || layerClasses[layer].layerClass == undefined) {
			//	createLayerClasses(layer);
			////	areas[areaIndex],
			//}
			checkLayerClass(layer);
		} else {
			//alert('Layer '+layer+' for area '+areaIndex+' is not defined. Skipping' );
			//areas[areaIndex].areaLayer[layer] = initAreaLayer(layer);
			//checkLayerClass(layer);
		}
		if (layerClasses[layer.name] == undefined || layerClasses[layer.name].createLayerClass == undefined) {
			console.log('Class definition not found for layer '+layer );
		} else {
			var _al = areas[areaIndex].areaLayer[layer.name];
			if (_al.object == undefined) {
				_al.object 					= layerClasses[layer.name].createLayerClass();
				_al.object.areaIndex 		= areaIndex;

				if (_al.properties != undefined) {
					for (var keyProp in _al.properties) {
						_al.object.options.properties[keyProp] 	= _al.properties[keyProp];
					}
				};
			}
			if (_al.object.options.activate != undefined && _al.object.options.activate == false) {
				_al.activate 					= false;
				_al.active 						= false;
			} else {
				_al.activate 					= true;
				_al.active 						= false;
				addLayersToMap();
			}
		}
		return _layer;

	}


	var addLayersToMap = function() {
		for (var i=0;i<areas.length;i++) {
			var _area = areas[i];
			for (var key in _area.areaLayer) {
			//	var _layer = _area.layers[key];
				if (_area.areaLayer[key].active == false && _area.areaLayer[key].activate == true && _area.areaLayer[key].object ) {
					if (_area.areaLayer[key].object.options.waitFirstTime ) {
						window.setTimeout(function(param1){
							map.addLayer(param1);
						}, _area.areaLayer[key].object.options.waitFirstTime, _area.areaLayer[key].object );
						_area.areaLayer[key].object.options.waitFirstTime = undefined;
					} else {
						map.addLayer(_area.areaLayer[key].object);
					}
					_area.areaLayer[key].activate = false;
					_area.areaLayer[key].active = true;
				}
//				if (_area.areaLayer[key].activate == false && _area.areaLayer[key].layer.layerObjectName =="heatmapTrafficFlowLayer") {
//					_area.areaLayer[key].activate = true;
//				}
			}
		}
	}

	var addRemoveLayerToMap = function(layer, areaIndex) {
		var _area = areas[areaIndex];
		var _layer = _area.areaLayer[layer.name];
		if (_layer == undefined || _layer.object == undefined) {
			// load layer object from class
			activateLayer(layer, areaIndex);
		}

		if (_layer && _layer.object) {
			if (_layer.active == false) {
				map.addLayer(_layer.object);
				_layer.active = true;
			} else {
				map.removeLayer(_layer.object);
				_layer.active = false;
			}
		}
	}


	var siteAireas;

	this.constructor = function(objectId, options) {
		//Execute the constructor of the class we extended.
        this.super(objectId, options);

		apriConfig = APRI.getConfig();
		apriClientInfo = APRI.getClientInfo();
		tickEventActive = false;

//		this.getTemplate('test', {urlSystemRoot: apriConfig.urlSystemRoot, app: 'aireas' }, {}, function(err, result) {
//		}, null);
		//

		initAreas(maxAreas);

		//get url variables
		getDeepLinkVars();
		currentArea = -1;
		var _empty = {};




		// init config values
		appConfig.viewZoomLevel = 9;
		appConfig.mapCenterLat	= 51.45401;
		appConfig.mapCenterLng	= 5.47668;


		// sessionstorage for session related data. Session data persists during lifetime every browser tab.
		// for info see https://code.google.com/p/sessionstorage/ (window.sessionStorage)
		sessionStorage.length; // 0
		sessionStorage.setItem("key", "value");
		// sessionStorage.getItem("key");
		// sessionStorage.removeItem("test");
		// sessionStorage.clear();



		// reset config from cookies
		apriCookieBase = new ApriCore.ApriCookieBase();
		var _viewZoomLevel = apriCookieBase.getCookie('viewZoomLevel');
		if ( _viewZoomLevel != undefined && _viewZoomLevel >=0 && _viewZoomLevel <=18 ) {
			appConfig.viewZoomLevel = _viewZoomLevel;
		}
		apriCookieBase.setCookie('viewZoomLevel', appConfig.viewZoomLevel, 31);  //expdays

		var _mapCenterLat = apriCookieBase.getCookie('mapCenterLat');
		var _mapCenterLng = apriCookieBase.getCookie('mapCenterLng');
		if ( _mapCenterLat == undefined || _mapCenterLng == undefined || _mapCenterLat == NaN || _mapCenterLng == NaN) {
		} else {
			appConfig.mapCenterLat = parseFloat(_mapCenterLat);
			appConfig.mapCenterLng = parseFloat(_mapCenterLng);
		}
		apriCookieBase.setCookie('mapCenterLat', appConfig.mapCenterLat, 31);  //expdays
		apriCookieBase.setCookie('mapCenterLng', appConfig.mapCenterLng, 31);  //expdays



		secureSite 			= true;
		siteProtocol 		= secureSite?'https://':'http://';
//		siteAireas			= siteProtocol + 'scapeler.com/SCAPE604';
		siteAireas			= siteProtocol + 'openiod.org/SCAPE604';
		sitePrefixExtern	= 'openiod.org/extern/';  //'scapeler.com/extern/'; //''


 		// get selection list for municipals
		ajaxGetData(siteAireas + "/data/aireas/getCbsGemeenten/*",
			function(data) {
				var _data = JSON.parse(data);
				gemeenten = d3.map( _data );
		 		initDropDownGemeente({container:mapPanes.controlerPane});
			}
		);

		apriLeafLetBase = new ApriCore.ApriLeafLetBase();

		L.AwesomeMarkers.Icon.prototype.options.prefix = 'fa';

		var sideBarControle = document.createElement('div');
//		sideBarControle.id = APRI.UTIL.apriGuid(sideBarControle.id );
		sideBarControle.id = "sidebar";
		sideBarControle.className += " " + "sidebar collapsed";

//		sideBarControle.style.height 	= container.style.height;
//		sideBarControle.style.width 	= container.style.width;
//		sideBarControle.setAttribute('height', container.style.height);
//		sideBarControle.setAttribute('width', container.style.width);
		sideBarControle.addEventListener('mouseleave',function(e){sideBarControle.classList.remove("collapsed");sideBarControle.classList.add("collapsed");})
		this.appContainer.appendChild(sideBarControle);

		sideBarControle.innerHTML = '	<!-- Nav tabs --> \
        <ul class="sidebar-tabs" role="tablist"> \
            <li><a href="#home" role="tab"><i class="fa fa-bars"></i></a></li> \
            <li><a href="#sidebarlayers" role="tab"><i class="fa fa-layers leaflet-control-layers-toggle"></i></a></li> \
            <li><a href="#profile" role="tab"><i class="fa fa-user"></i></a></li> \
            <li><a href="#messages" role="tab"><i class="fa fa-envelope"></i></a></li> \
            <li><a href="#settings" role="tab"><i class="fa fa-gear"></i></a></li> \
        </ul> \
		<!-- Tab panes --> \
        <div class="sidebar-content active"> \
            <div class="sidebar-pane" id="home"> \
                <h1>Scapeler.com</h1> \
                <p>Welkom bij Scapeler.com, dé locatie waar (Open) data samenkomt op de kaart en in de tijd.  </p> \
                <p>Deze applicatie wordt u aangeboden door <a target="_blank" href="http://scapeler.com/">Scapeler.com</a>.</p> \
                <h3>Disclaimer:</h3> \
                <p>Deze applicatie doet zijn best om op een open en transparante wijze data te verbeelden. Verbeelden is echter interpreteren. Uit het resultaat kan daarom geen eenduidige conclusie worden getrokken, weest daarin terughoudend. Scapeler.com is voortdurend bezig om u nog beter van informatie te voorzien. Laat daarom aan ons weten indien u verbeteringen ziet of aanvullende functionaliteiten wenst. </p> \
            </div> \
            <div class="sidebar-pane" id="sidebarlayers"><h1>Kaartlagen</h1><p>Hier komt later meer informatie en mogelijkheid tot selectie. Zoals bijvoorbeeld de kaartlagen. Voor nu kunt u daarvoor nog het lagen-icoon gebruiken (rechtsboven in het venster )</p></div> \
            <div class="sidebar-pane" id="profile"><h1>Profiel</h1><p>Met een profiel kunt u een individuele instellingen opslaan en hergebruiken. Dit zal een meer persoonlijke belevening van de applicatie tot gevolg hebben. Voor een profiel dient u een account te hebben waarmee u zich aan kunt melden in het systeem.</p></div> \
            <div class="sidebar-pane" id="messages"><h1>Signaalberichten</h1><p>Overschrijding van meetwaardegrenzen, zoals bijvoorbeeld voor luchtkwaliteit (fijnstof) op gemiddeld wijkniveau, kan automatisch gesignaleerd worden met een e-mail bericht. Hieronder ziet u een voorbeeld van zo\'n bericht. </p> \
			<h1>voorbeeld e-mail bericht:</h1><h2>Informatie over daling of stijging meetwaarde luchtkwaliteit</h2><p>Datum: 24-11-2014, 20:40</p><h3>Signaal voor wijk \'Wijk 12 Stadsdeel Stratum\'</h3><p> Index voor luchtkwaliteit is gestegen boven grenswaarde 15</p> 	Gemeente: Eindhoven (GM0772)<br> 	Wijk: Wijk 12 Stadsdeel Stratum<br> 	Inwoners: 32475<br> 	Vorige waarde: 14.8<br> 	Actuele waarde: <b>15.5</b><br> 	<br> \
			</div> \
            <div class="sidebar-pane" id="settings"><h1>Instellingen</h1></div> \
        </div>';


/*
		// Apri D3 logo
		//-----------------------------------------------------------------------------------------
		//var svg_logo_container 	= document.getElementById(this.apriFormContainerId+"-leafletjs-aprisidebar");
		new ApriCore.ApriD3Logo().createLogo( {
				container:  options.container // '#' + "sidebar"
			});
        // Apri D3 logo end
*/




//		var appBodyContainer = document.getElementsByClassName('apri-app-body apri-client-aireas')[0];

		var logoContainer = document.createElement('div');
		logoContainer.className = 'logo-container';
		this.appContainer.appendChild(logoContainer);

		var leafletContainer = document.createElement('div');
		leafletContainer.className = 'apri-leaflet-container';
		this.appContainer.appendChild(leafletContainer);

		var _container = document.createElement('div');
		_container.className = 'top-logo-container';
		var scapelerLogo = document.createElement('img');
		scapelerLogo.className = 'top-logo';
		scapelerLogo.src = "../client/apri-client-aireas/logos/scapeler.png";
		scapelerLogo.alt = "Scapeler";
		_container.appendChild(scapelerLogo);
		var _containerLabel = document.createElement('div');
		_containerLabel.className = 'top-logo-label';
		_containerLabel.innerHTML = 'Scapeler';
		_container.appendChild(_containerLabel);
		logoContainer.appendChild(_container);

		var _container = document.createElement('div');
		_container.className = 'top-logo-container';
		var aireasLogo = document.createElement('img');
		aireasLogo.className = 'top-logo';
		aireasLogo.src = "https://pbs.twimg.com/profile_images/1524863861/aireas_profilepic_400x400.jpg";
		aireasLogo.alt = "AiREAS";
		_container.appendChild(aireasLogo);
		var _containerLabel = document.createElement('div');
		_containerLabel.className = 'top-logo-label';
		_containerLabel.innerHTML = 'AiREAS';
		_container.appendChild(_containerLabel);
		logoContainer.appendChild(_container);
		_container.addEventListener("click", aireasLogoClick );


		// add an areabutton voor every city in deeplink
		for (var i=0;i<areas.length;i++) {
			if (areas[i].deepLinkVars.city != null) {
				var city = areas[i].deepLinkVars.city;
				if (cityArea[city] && cityArea[city].cityAreaCode) {
					var cityKey = cityArea[city].cityAreaCode;
					// areas[i].cityKey;

					var _container = document.createElement('div');
					_container.className = cityArea[city].classNames ;
					_container.areaId = areas[i].areaId;
					_container.id = _container.areaId;
					_container.addEventListener("click", cityArea[city].onClick );
					_container.addEventListener("mouseenter", cityArea[city].onMouseEnter );
					_container.addEventListener("mouseleave", cityArea[city].onMouseLeave );
					areas[i].areasButtonContainer = _container;

					if (cityArea[city].logo) {
						var _logo = document.createElement('img');
						_logo.className = cityArea[city].logo.classNames;
						_logo.src = cityArea[city].logo.src;
						_logo.alt = cityArea[city].logo.alt;
						_container.appendChild(_logo);

					} else {
						var _logo = document.createElement('div');
						_logo.className = 'top-logo-noimg';
						_container.appendChild(_logo);
						//_logo.addEventListener("click", cityArea[cityKey].logo.onClick );

					}

					var _containerLabel = document.createElement('div');
					_containerLabel.className = 'top-logo-label';
					_containerLabel.innerHTML = cityArea[city].logoLabel;
					_container.appendChild(_containerLabel);

					logoContainer.appendChild(_container);
				}
			}
		}

		// add an areabutton for every standard city not included in deeplink
		for (var city in cityArea) {
			var areaAlreadyPresent = false;
			var firstFreeAreaIndex = -1;
			for (var i=0;i<areas.length;i++){
				if (city == areas[i].deepLinkVars.city) {
					areaAlreadyPresent = true;
					break;
				}
				if (firstFreeAreaIndex == -1 &&  areas[i].deepLinkVars.city == undefined ) {
					firstFreeAreaIndex = i;
				}
			}
			if (areaAlreadyPresent == false && firstFreeAreaIndex != -1) {
				var _container = document.createElement('div');
				_container.className = cityArea[city].classNames ;
				_container.areaId = APRI.UTIL.apriGuid( _container.areaId );
				_container.id = _container.areaId;
				_container.addEventListener("click", cityArea[city].onClick );
				_container.addEventListener("mouseenter", cityArea[city].onMouseEnter );
				_container.addEventListener("mouseleave", cityArea[city].onMouseLeave );
				areas[firstFreeAreaIndex].areasButtonContainer = _container;
				areas[firstFreeAreaIndex].deepLinkVars.city = city;
				areas[firstFreeAreaIndex].areaId = _container.areaId;

				if (cityArea[city].logo) {
					var _logo = document.createElement('img');
					_logo.className = cityArea[city].logo.classNames;
					_logo.src = cityArea[city].logo.src;
					_logo.alt = cityArea[city].logo.alt;
					_container.appendChild(_logo);

				} else {
					var _logo = document.createElement('div');
					_logo.className = 'top-logo-noimg';
					_container.appendChild(_logo);
					//_logo.addEventListener("click", cityArea[city].logo.onClick );

				}

				var _containerLabel = document.createElement('div');
				_containerLabel.className = 'top-logo-label';
				_containerLabel.innerHTML = cityArea[city].logoLabel;
				_container.appendChild(_containerLabel);

				logoContainer.appendChild(_container);

				}

		}

		var _container = document.createElement('div');
		_container.className = 'top-logo-container';
	//	var aireasLogo = document.createElement('img');
	//	aireasLogo.className = 'top-logo';
	//	aireasLogo.src = "https://pbs.twimg.com/profile_images/1524863861/aireas_profilepic_400x400.jpg";
	//	aireasLogo.alt = "AiREAS";
	//	_container.appendChild(aireasLogo);
		var _containerLabel = document.createElement('div');
		_containerLabel.className = 'top-logo-label';
		_containerLabel.innerHTML = 'Nieuw gebied';
		_container.appendChild(_containerLabel);
		logoContainer.appendChild(_container);
		_container.addEventListener("click", newAreaClick );


		var _container = document.createElement('div');
		_container.className = 'top-logo-msg';
		_container.innerHTML = "WERK IN UITVOERING!! Deze applicatie zal van tijd tot tijd verstoringen vertonen welke zsm opgelost worden. Kom regelmatig even kijken en laat je verassen door de vooruitgang die wordt geboekt. Houd ons in de gaten en je zult begrijpen wat innovatie betekent. <BR/><BR/>UNDER CONSTRUCTION!! That's why this application will sometimes break into pieces but always get repaired. If you come back on a regular basis, then you will see we are making great progress overtime. Keep watchin and you'll know what innovation means.";
		logoContainer.appendChild(_container);

/*
		var _container = document.createElement('div');
		_container.className = 'top-logo';
		var aireasLogo = document.createElement('img');
		aireasLogo.className = 'top-logo';
		aireasLogo.src = "https://pbs.twimg.com/profile_images/1524863861/aireas_profilepic_400x400.jpg";
		aireasLogo.alt = "AiREAS Eindhoven";
		_container.appendChild(aireasLogo);
		logoContainer.appendChild(_container);
		aireasLogo.addEventListener("click", aireasLogoClick );

		var eindhovenLogo = document.createElement('img');
		eindhovenLogo.className = 'top-logo gemeente';
		eindhovenLogo.src = "../client/apri-client-aireas/logos/Eindhoven.png";
		eindhovenLogo.alt = "Eindhoven";
		logoContainer.appendChild(eindhovenLogo);

		var helmondLogo = document.createElement('img');
		helmondLogo.className = 'top-logo gemeente';
		helmondLogo.src = "../client/apri-client-aireas/logos/Helmond.gif";
		helmondLogo.alt = "Helmond";
		logoContainer.appendChild(helmondLogo);

		var bredaLogo = document.createElement('img');
		bredaLogo.className = 'top-logo gemeente';
		bredaLogo.src = "../client/apri-client-aireas/logos/Breda.jpg";
		bredaLogo.alt = "Breda";
		logoContainer.appendChild(bredaLogo);

*/


    // Here is where the magic happens: Manipulate the z-index of tile layers,
    // this makes sure our vector data shows up above the background map and
    // under roads and labels.
//    var topPane = map._createPane('leaflet-top-pane', map.getPanes().mapPane);
//    var topLayer = L.mapbox.tileLayer('bobbysud.map-3inxc2p4').addTo(map);
//    topPane.appendChild(topLayer.getContainer());
//    topLayer.setZIndex(7);

		var endDate = new Date();
		endDate.setUTCMinutes(0, 0, 0);

//		map 			= apriLeafLetBase.createMap(this.container, {viewCoordinates: [appConfig.mapCenterLat, appConfig.mapCenterLng], viewZoomLevel: appConfig.viewZoomLevel });
		map 			= apriLeafLetBase.createMap(leafletContainer, {'topAreaHeight':85, viewCoordinates: [appConfig.mapCenterLat, appConfig.mapCenterLng]
			, viewZoomLevel: appConfig.viewZoomLevel
			, timeDimension: true, timeDimensionControl: true
			, timeDimensionOptions: {
        		timeInterval: "P2W/" + endDate.toISOString(),
        		period: "PT5M"
    		}
		});
		mapPanes 		= map.getPanes();
		baseMaps 		= {};
		aireasBaseMaps	= {};

//		aireasTileLayer 	= apriLeafLetBase.createTileLayer();

		//retrievedDateCache 	= [];
		//retrievedDateCacheTrafficFlow = [];

		var sidebar = L.control.sidebar(sideBarControle.id ).addTo(map);

		//initGridGemLayer();  // actions for event add/remove layers
		initMapAddRemoveLayersEvent();  // actions for event add/remove layers

//		initCbsGridGemLayer();
//		cbsGridGemLayer.addTo(map);



  		markers['videoCameraMarker'] = L.AwesomeMarkers.icon({
    		icon: 'video-camera',
			//	prefix: 'fa',
    		markerColor: 'blue',
			//	spin:true,
			iconColor: 'white'
  		});

  		markers['airboxMarkerGreen'] = L.AwesomeMarkers.icon({
    		icon: 'bar-chart',
			//	prefix: 'fa',
    		markerColor: 'green',
			//	spin:true,
			iconColor: 'white'
  		});
  		markers['airboxMarkerBlue'] = L.AwesomeMarkers.icon({
    		icon: 'bar-chart',
			//	prefix: 'fa',
    		markerColor: 'blue',
			//	spin:true,
			iconColor: 'white'
  		});
  		markers['airboxMarkerPurple'] = L.AwesomeMarkers.icon({
    		icon: 'bar-chart',
			//	prefix: 'fa',
    		markerColor: 'purple',
			//	spin:true,
			iconColor: 'white'
  		});
  		markers['airboxMarkerDarkPurple'] = L.AwesomeMarkers.icon({
    		icon: 'bar-chart',
			//	prefix: 'fa',
    		markerColor: 'darkpurple',
			//	spin:true,
			iconColor: 'white'
  		});

  		markers['solutionMarker'] = L.AwesomeMarkers.icon({
    		icon: 'thumbs-o-up',
			//	prefix: 'fa',
    		markerColor: 'green',
			//	spin:true,
			iconColor: 'white'
  		});
  		markers['usersMarker'] = L.AwesomeMarkers.icon({
    		icon: 'users',
			//	prefix: 'fa',
    		markerColor: 'blue',
			//	spin:true,
			iconColor: 'white'
  		});
  		markers['localProductMarker'] = L.AwesomeMarkers.icon({
    		icon: 'cutlery',
			//	prefix: 'fa',
    		markerColor: 'blue',
			//	spin:true,
			iconColor: 'white'
  		});
  		markers['energieMarker'] = L.AwesomeMarkers.icon({
    		icon: 'fa-battery-full',
			//	prefix: 'fa',
    		markerColor: 'blue',
			//	spin:true,
			iconColor: 'white'
  		});




        var icon32_32 = L.Icon.extend({
            options: {
                iconSize: [32,32],
                iconAnchor: [18,32],
                shadowUrl: APRI.getConfig().urlSystemRoot + '/client/apri-client-aireas/lib/aireas/images/marker-shadow.png',
                shadowSize: [32,13],
                shadowAnchor: [18,16],
                popupAnchor: [0,-30]
            }
        });
        var trainIcon = new icon32_32({
                iconUrl:APRI.getConfig().urlSystemRoot + '/client/apri-client-aireas/lib/aireas/images/ic_train.png'
				,shadowUrl:null
            });
        var plantIcon = new icon32_32({
                iconUrl:APRI.getConfig().urlSystemRoot + '/client/apri-client-aireas/lib/aireas/images/marker-icon.png'
				,shadowUrl:APRI.getConfig().urlSystemRoot + '/client/apri-client-aireas/lib/aireas/images/marker-shadow.png',
            });
        var parkingIcon = new icon32_32({
                iconUrl:APRI.getConfig().urlSystemRoot + '/client/apri-client-aireas/lib/aireas/images/poi_parkride_blue.png'
				,shadowUrl:APRI.getConfig().urlSystemRoot + '/client/apri-client-aireas/lib/aireas/images/marker-shadow.png',
            });

//        var aireasMeetkastIcon = new icon32_32({
//                iconUrl:APRI.getConfig().urlSystemRoot + '/client/apri-client-aireas/lib/aireas/images/marker-icon.png'
//				,shadowUrl:APRI.getConfig().urlSystemRoot + '/client/apri-client-aireas/lib/aireas/images/marker-shadow.png',
//            });


  		//L.marker([51.46984,5.53127], {icon: redMarker}).addTo(map);








/*
  "foiperiodcode";"foicode";"location";"city";"lat";"lng";"startdate";"enddate"
"esd11b-1";"esd11b";"Esdoornstraat";"Best";51.516531;5.395981;"6/4/2016 11:45:00";"6/5/2016 20:22:00"
"esd11b-2";"esd11b";"Esdoornstraat";"Best";51.516531;5.395981;"6/5/2016 22:04:00";"6/9/2016 09:05:00"
"esd11b-3";"esd11b";"Esdoornstraat";"Best";51.516531;5.395981;"6/26/2016 21:11:00";"6/28/2016 17:10:00"
"ww148e-1";"ww148e";"Meerhoven";"Eindhoven";51.437251;5.403233;"6/9/2016 10:15:00";"6/12/2016 19:50:00"
"ww148e-2";"ww148e";"Meerhoven";"Eindhoven";51.437251;5.403233;"6/22/2016 15:12:00";"6/26/2016 20:40:00"
"lwl3e-1";"lwl3e";"Leeuweriklaan";"Eindhoven";51.442960;5.493789;"6/28/2016 19:58:00";"7/1/2016 13:50:00"
"ehz77b-1";"ehz77b";"Eindhovenseweg";"Best";51.494900;5.423496;"7/5/2016 20:59:00";"7/9/2016 16:45:00"
"hbcb-1";"hbcb";"Heerbeeck";"Best";51.500289;5.383092;"6/12/2016 20:25:00";"6/14/2016 20:05:00"
"jstb-1";"jstb";"Rosheuvel";"Best";51.516531;5.395981;"6/14/2016 19:37:00";"6/14/2016 20:05:00"
"jsab-1";"jsab";"auto";"Best";51.505;5.385;"6/14/2016 20:25:00";"6/15/2016 07:30:00"
"41-1";"41";jose 41;;51.4966;5.3718;"6/9/2016 16:00:00";"7/20/2016 08:00:00"
"43-1";"43";jose 43;;51.5166;5.3956;"6/7/2016 21:00:00";"6/22/2016 09:00:00"
"43-2";"43";jose 43;;51.4374;5.4026;"6/22/2016 15:00:00";"6/28/2016 21:00:00"
"43-3";"43";jose 43;;51.4374;5.4026;"6/29/2016 09:00:00";"7/1/2016 13:00:00"
"43-4";"43";jose 43;;51.4946;5.4236;"7/5/2016 21:00:00";"7/9/2016 16:00:00"
*/


		var projectAirportLocations	= [
			{ locationCode: 'esdb11b', description:'Esdoornstraat', city:'Best', lat:51.5166 , lng:5.3956, labelFactor:1
				, times:[
					{ begin: new Date("2016-06-04T09:00:00Z"), end: new Date("2016-06-07T19:00:00Z") },
					{ begin: new Date("2016-06-07T20:00:00Z"), end: new Date("2016-06-09T08:00:00Z") },
					{ begin: new Date("2016-06-26T19:00:00Z"), end: new Date("2016-06-28T22:00:00Z") }
				]},
			{ locationCode: 'ww148e', description:'Meerhoven', city:'Eindhoven', lat:51.4374 , lng:5.4026, labelFactor:1
				, times:[
					{ begin: new Date("2016-06-09T08:00:00Z"), end: new Date("2016-06-12T18:00:00Z") },
					{ begin: new Date("2016-06-22T13:00:00Z"), end: new Date("2016-06-26T19:00:00Z") }
				]},
			{ locationCode: 'lwl3e', description:'Leeuweriklaan', city:'Walik', lat:51.361034 , lng:5.371153, labelFactor:1
				, times:[
					{ begin: new Date("2016-06-12T17:00:00Z"), end: new Date("2016-06-14T12:00:00Z") },
					{ begin: new Date("2016-06-28T17:00:00Z"), end: new Date("2016-07-05T12:00:00Z") }
				]  },
			{ locationCode: 'ehz77b', description:'Eindhovenseweg', city:'Best', lat:51.4946 , lng:5.4236, labelFactor:1
				, times:[
					{ begin: new Date("2016-07-05T18:00:00Z"), end: new Date("2016-07-09T15:00:00Z") }
				]  },
			{ locationCode: 'hbcb', description:'Heerbeeck', city:'Best', lat:51.500289 , lng:5.383092, labelFactor:1
				, times:[
					{ begin: new Date("2016-06-15T18:00:00Z"), end: new Date("2016-06-22T10:00:00Z") }
				]  },
			{ locationCode: 'jstb', description:'Rosheuvel', city:'Best', lat:51.4966 , lng:5.3718, labelFactor:4
				, times:[
					{ begin: new Date("2016-06-14T17:00:00Z"), end: new Date("2016-06-15T10:00:00Z") }
				]  },
			{ locationCode: 'jst41b', description:'Rosheuvel(41)', city:'Best', lat:51.4966 , lng:5.3718, labelFactor:5
				, times:[
					{ begin: new Date("2016-06-09T09:00:00Z"), end: new Date("2016-07-20T18:00:00Z") }
				]  }
		]


/*
		var projectAirport_TimeLineData = [
			{label: "Location a", times: [{"starting_time": 1355752800000, "ending_time": 1355759900000}, {"starting_time": 1355767900000, "ending_time": 1355774400000}]},
			{label: "Location b", times: [{"starting_time": 1355759910000, "ending_time": 1355761900000}, ]},
			{label: "Location c", times: [{"starting_time": 1355761910000, "ending_time": 1355763910000}]}
		]
*/

		var projectAirport_TimeLineData	= [];

		for (var i=0;i<projectAirportLocations.length;i++) {
			var _location 			= {};
			_location.label			= projectAirportLocations[i].description;
			_location.lat 			= projectAirportLocations[i].lat;
			_location.lng 			= projectAirportLocations[i].lng;
			_location.locationCode 	= projectAirportLocations[i].locationCode;
			_location.labelFactor 	= projectAirportLocations[i].labelFactor;
			_location.times			= [];
			for (var j=0;j<projectAirportLocations[i].times.length;j++) {
				var _time 				= {};
				_time.starting_time 	= projectAirportLocations[i].times[j].begin.getTime();
				_time.ending_time 		= projectAirportLocations[i].times[j].end.getTime();
				_location.times.push(_time);
			}
			projectAirport_TimeLineData.push(_location);

		}



		// video camera
		var projectAirport_GeoJson = {
			"type": "FeatureCollection",
			"features": [
			{
				"type": "Feature",
				"geometry": {
					"type": "Point",
					"coordinates": [ 5.3956, 51.5166 ]
				},
				"properties": {
					id: "esd11b",
					name: "Esdoornstraat, Best"
				}
			},
			{
				"type": "Feature",
				"geometry": {
					"type": "Point",
					"coordinates": [ 5.4026, 51.4374 ]
				},
				"properties": {
					id: "ww148e",
					name: "Meerhoven, Eindhoven"
				}
			},
			{
				"type": "Feature",
				"geometry": {
					"type": "Point",
					"coordinates": [ 5.371153, 51.361034 ]
				},
				"properties": {
					id: "lwl3e",
					name: "Leeuweriklaan, Walik"
				}
			},
			{
				"type": "Feature",
				"geometry": {
					"type": "Point",
					"coordinates": [ 5.4236, 51.4946 ]
				},
				"properties": {
					id: "ehz77b",
					name: "Eindhovenseweg, Best"
				}
			},
			{
				"type": "Feature",
				"geometry": {
					"type": "Point",
					"coordinates": [ 5.383092, 51.500289 ]
				},
				"properties": {
					id: "hbcb",
					name: "Heerbeeck, Best"
				}
			},
			{
				"type": "Feature",
				"geometry": {
					"type": "Point",
					"coordinates": [ 5.3718, 51.4966 ]
				},
				"properties": {
					id: "jstb",
					name: "Rosheuvel, Best"
				}
			}
/*			{
				"type": "Feature",
				"geometry": {
					"type": "Point",
					"coordinates": [ 5.385, 51.505 ]
				},
				"properties": {
					id: "jsab",
					name: "Auto, Best"
				}
			},
*/
/*	is gelijk aan jstb
			{
				"type": "Feature",
				"geometry": {
					"type": "Point",
					"coordinates": [ 5.3718, 51.4966 ]
				},
				"properties": {
					id: "41",
					name: "Jose 41"
				}
			},
*/
/*	is gelijk aan esd11b
			{
				"type": "Feature",
				"geometry": {
					"type": "Point",
					"coordinates": [ 5.3956, 51.5166 ]
				},
				"properties": {
					id: "43-1",
					name: "Jose 43-1"
				}
			},
*/
/*	is gelijk aan ww148e
			{
				"type": "Feature",
				"geometry": {
					"type": "Point",
					"coordinates": [ 5.4026, 51.4374 ]
				},
				"properties": {
					id: "43-2/3",
					name: "Jose 43-2,43-3"
				}
			},
*/
/*	is gelijk aan ehz77b
			{
				"type": "Feature",
				"geometry": {
					"type": "Point",
					"coordinates": [ 5.4236, 51.4946 ]
				},
				"properties": {
					id: "43-4",
					name: "Jose 43-4"
				}
			}
*/

			]
		}

/*
		var projectAirport_TimeLineData = [
			{times: [{"starting_time": 1355752800000, "ending_time": 1355759900000}, {"starting_time": 1355767900000, "ending_time": 1355874400000}]},
			{times: [{"starting_time": 1355759910000, "ending_time": 1355761900000}, ]},
			{times: [{"starting_time": 1355761910000, "ending_time": 1355763910000}]}
		]
*/


		projectAirportLayer = new L.geoJson(projectAirport_GeoJson
			, {
                    layerType: 			'projectAirportLayer'
					, data: 			projectAirport_TimeLineData
					, onEachFeature:	onEachProjectAirportFeature
                    , pointToLayer: 	function (feature, latlng) {
                        return L.marker(latlng, { icon: markers.airboxMarkerBlue} );
                        }
                }
		);

		function onEachProjectAirportFeature (feature, layer) {
            // does this feature have a property named popupContent?
            if (feature.properties && feature.properties.name) {
                layer.bindPopup(feature.properties.name );
            }

			(function(layer, properties) {
				// Create a mouseover event
      			layer.on("mouseover", function (e) {
					this.openPopup();

/*
        			// Create a popup with a unique ID linked to this record
					var popup 	= document.createElement('div');
					popup.id 	= 'popup-' + properties.id;
					popup.style.position = 'absolute';
					popup.style.bottom = '85px';
					popup.style.left = '50px';
					popup.style.zIndex = 1002;
					popup.style.backgroundColor = 'white';
					popup.style.padding = '8px';
					popup.style.border = '1px solid #ccc';
        			// Insert a headline into that popup
					var head = document.createElement('div');
					var _innerHtml = properties.name;
					head.innerHTML = _innerHtml;
					head.style.fontSize = '16px';
					head.style.marginBottom = '3px';
					popup.appendChild(head);
					mapPanes.popupPane.appendChild(popup);
*/
				});

      			layer.on("click", function (e) {
					if (e.target.feature.properties.type == 'uStream') {
						var uStreamElement = document.getElementById('ustream');
						if ( uStreamElement == null ) {
							initUStream(uStreamHtml, e.target.feature);
						}
					}
					if (e.target.feature.properties.type == 'url') {
						OpenInNewTab(e.target.feature.properties.src)
					}
				});

      			// Create a mouseout event that undoes the mouseover changes
      			layer.on("mouseout", function (e) {
					this.closePopup();
					//document.getElementById('popup-' + properties.id).remove();
      			});
      			// Close the "anonymous" wrapper function, and call it while passing
      			// in the variables necessary to make the events work the way we want.
			})(layer, feature.properties);
        }



		// biomassa energiecentrales Eindhoven
		var bioMassaCentraleEindhoven_GeoJson = {
			"type": "FeatureCollection",
			"features": [ {
				"type": "Feature",
				"geometry": {
					"type": "Point",
					"coordinates": [ 5.512317, 51.448977 ]
				},
				"properties": {
					id: "Wasven",
					name: "biomassacentrale verwarmt Philipsboerderij met bio-olie",
					type: "url",
					src: "http://energeia.nl/nieuws/2007/11/16/kleine-biomassacentrale-verwarmt-philipsboerderij-met-bio-olie-uit-koeien"
					//Philipsboerderij gerealiseerd in het jaar 2007, vermogen elektrisch 33kW en thermisch 42 kW
				}
			},
			{
				"type": "Feature",
				"geometry": {
					"type": "Point",
					"coordinates": [ 5.478287, 51.415155 ]
				},
				"properties": {
					id: "Tongelreep",
					name: "Bio-energiecentrale zwemcentrum De Tongelreep",
					type: "url",
					src: "http://www.zri.nl/uploads/referentiebladen/Bio-energiecentrale%20zwemcentrum%20De%20Tongelreep,%20Eindhoven.pdf"
				}
			},
			{
				"type": "Feature",
				"geometry": {
					"type": "Point",
					"coordinates": [ 5.457717, 51.476230 ]
				},
				"properties": {
					id: "ottenbad",
					name: "Bio-energiecentrale Ir. Ottenbad",
					type: "url",
					src: "http://www.zri.nl/projecten/publiek/bio-energiecentrale-ir-ottenbad"
				}
			},
			{
				"type": "Feature",
				"geometry": {
					"type": "Point",
					"coordinates": [ 5.4055, 51.4428 ]
				},
				"properties": {
					id: "Meerhoven1",
					name: "WKK energiecentrale Zand- en Grasrijk (1)",
					type: "url",
					src: "http://www.olino.org/articles/2011/04/07/het-einde-van-stadverwarming/"
				}
			},
			{
				"type": "Feature",
				"geometry": {
					"type": "Point",
					"coordinates": [ 5.4055, 51.4430 ]
				},
				"properties": {
					id: "Meerhoven2",
					name: "WKK energiecentrale Zand- en Grasrijk (2)",
					type: "url",
					src: "http://www.olino.org/articles/2011/04/07/het-einde-van-stadverwarming/"
				}
			},
			{
				"type": "Feature",
				"geometry": {
					"type": "Point",
					"coordinates": [ 5.4055, 51.4432 ]
				},
				"properties": {
					id: "Meerhoven3",
					name: "WKK energiecentrale Zand- en Grasrijk (3)",
					type: "url",
					src: "http://www.olino.org/articles/2011/04/07/het-einde-van-stadverwarming/"
				}
			},
			{
				"type": "Feature",
				"geometry": {
					"type": "Point",
					"coordinates": [ 5.4055, 51.4434 ]
				},
				"properties": {
					id: "Meerhoven4",
					name: "WKK energiecentrale Zand- en Grasrijk (4)",
					type: "url",
					src: "http://www.olino.org/articles/2011/04/07/het-einde-van-stadverwarming/"
				}
			},
			{
				"type": "Feature",
				"geometry": {
					"type": "Point",
					"coordinates": [ 5.4055, 51.4436 ]
				},
				"properties": {
					id: "Meerhoven5",
					name: "WKK energiecentrale Zand- en Grasrijk (5)",
					type: "url",
					src: "http://www.olino.org/articles/2011/04/07/het-einde-van-stadverwarming/"
				}
			},
			{
				"type": "Feature",
				"geometry": {
					"type": "Point",
					"coordinates": [ 5.454027, 51.449378 ]
				},
				"properties": {
					id: "StrijpT",
					name: "Bio-energiecentrale Strijp-T",
					type: "url",
					src: "http://www.host.nl/nl/case/bio-energiecentrale-strijp/"
				}
			},
			{
				"type": "Feature",
				"geometry": {
					"type": "Point",
					"coordinates": [ 5.458, 51.447 ]
				},
				"properties": {
					id: "StrijpS",
					name: "Bio-energiecentrale Strijp-S",
					type: "url",
					src: "http://www.host.nl/nl/case/bio-energiecentrale-strijp/"
				}
			},
			{
				"type": "Feature",
				"geometry": {
					"type": "Point",
					"coordinates": [ 5.398, 51.443 ]
				},
				"properties": {
					id: "Meerhoven",
					name: "Bio-energiecentrale Meerhoven",
					type: "url",
					src: "http://www.host.nl/nl/case/meerhoven/"
				}
			}
			]
		}

		bioMassaCentraleEindhovenLayer = new L.geoJson(bioMassaCentraleEindhoven_GeoJson
			, {
                      onEachFeature:onEachBioMassaCentraleEindhovenFeature
                    , pointToLayer: function (feature, latlng) {
                        return L.marker(latlng, {icon: markers.energieMarker} );
                        }
                }
		);

		function onEachBioMassaCentraleEindhovenFeature (feature, layer) {
            // does this feature have a property named popupContent?
            if (feature.properties && feature.properties.name) {
                layer.bindPopup(feature.properties.name );
            }

			(function(layer, properties) {
				// Create a mouseover event
      			layer.on("mouseover", function (e) {
					this.openPopup();

/*
        			// Create a popup with a unique ID linked to this record
					var popup 	= document.createElement('div');
					popup.id 	= 'popup-' + properties.id;
					popup.style.position = 'absolute';
					popup.style.bottom = '85px';
					popup.style.left = '50px';
					popup.style.zIndex = 1002;
					popup.style.backgroundColor = 'white';
					popup.style.padding = '8px';
					popup.style.border = '1px solid #ccc';
        			// Insert a headline into that popup
					var head = document.createElement('div');
					var _innerHtml = properties.name;
					head.innerHTML = _innerHtml;
					head.style.fontSize = '16px';
					head.style.marginBottom = '3px';
					popup.appendChild(head);
					mapPanes.popupPane.appendChild(popup);
*/
				});

      			layer.on("click", function (e) {
					if (e.target.feature.properties.type == 'uStream') {
						var uStreamElement = document.getElementById('ustream');
						if ( uStreamElement == null ) {
							initUStream(uStreamHtml, e.target.feature);
						}
					}
					if (e.target.feature.properties.type == 'url') {
						OpenInNewTab(e.target.feature.properties.src)
					}
				});

      			// Create a mouseout event that undoes the mouseover changes
      			layer.on("mouseout", function (e) {
					this.closePopup();
					//document.getElementById('popup-' + properties.id).remove();
      			});
      			// Close the "anonymous" wrapper function, and call it while passing
      			// in the variables necessary to make the events work the way we want.
			})(layer, feature.properties);
        }



		// video camera
		var videoCamera_GeoJson = {
			"type": "FeatureCollection",
			"features": [ {
				"type": "Feature",
				"geometry": {
					"type": "Point",
					"coordinates": [ 5.4813, 51.43513 ]
				},
				"properties": {
					id: "18668654",
					name: "Livestream Centrum",
					type: "uStream",
					src: "http://www.ustream.tv/channel/18668654"
				}
			},
			{
				"type": "Feature",
				"geometry": {
					"type": "Point",
					"coordinates": [ 5.46909, 51.4386 ]
				},
				"properties": {
					id: "RochelroutesEindhoven",
					name: "Rochelroutes",
					type: "url",
					src: "http://www.rochelroutes.nl/"
				}
			},
			{
				"type": "Feature",
				"geometry": {
					"type": "Point",
					"coordinates": [ 5.4, 51.4386 ]
				},
				"properties": {
					id: "RIVMluchtkwaliteit",
					name: "RIVM Luchtkwaliteit ",
					type: "url",
					src: "http://www.lml.rivm.nl/verwachting/animatie.html"
				}
			}

			]
		}


		videoCameraLayer = new L.geoJson(videoCamera_GeoJson
			, {
                      onEachFeature:onEachVideoCameraFeature
                    , pointToLayer: function (feature, latlng) {
                        return L.marker(latlng, { icon: markers.videoCameraMarker} );
                        }
                }
		);

		function onEachVideoCameraFeature (feature, layer) {
            // does this feature have a property named popupContent?
            if (feature.properties && feature.properties.name) {
                layer.bindPopup(feature.properties.name );
            }

			(function(layer, properties) {
				// Create a mouseover event
      			layer.on("mouseover", function (e) {
					this.openPopup();

/*
        			// Create a popup with a unique ID linked to this record
					var popup 	= document.createElement('div');
					popup.id 	= 'popup-' + properties.id;
					popup.style.position = 'absolute';
					popup.style.bottom = '85px';
					popup.style.left = '50px';
					popup.style.zIndex = 1002;
					popup.style.backgroundColor = 'white';
					popup.style.padding = '8px';
					popup.style.border = '1px solid #ccc';
        			// Insert a headline into that popup
					var head = document.createElement('div');
					var _innerHtml = properties.name;
					head.innerHTML = _innerHtml;
					head.style.fontSize = '16px';
					head.style.marginBottom = '3px';
					popup.appendChild(head);
					mapPanes.popupPane.appendChild(popup);
*/
				});

      			layer.on("click", function (e) {
					if (e.target.feature.properties.type == 'uStream') {
						var uStreamElement = document.getElementById('ustream');
						if ( uStreamElement == null ) {
							initUStream(uStreamHtml, e.target.feature);
						}
					}
					if (e.target.feature.properties.type == 'url') {
						OpenInNewTab(e.target.feature.properties.src)
					}
				});

      			// Create a mouseout event that undoes the mouseover changes
      			layer.on("mouseout", function (e) {
					this.closePopup();
					//document.getElementById('popup-' + properties.id).remove();
      			});
      			// Close the "anonymous" wrapper function, and call it while passing
      			// in the variables necessary to make the events work the way we want.
			})(layer, feature.properties);
        }

		function OpenInNewTab(url) {
  			var win = window.open(url, '_blank');
  			win.focus();
		}

		// video camera
		var participation_GeoJson = {
			"type": "FeatureCollection",
			"features": [ {
				"type": "Feature",
				"geometry": {
					"type": "Point",
					"coordinates": [ 5.4631, 51.42495 ]
				},
				"properties": {
					id: "Omslag",
					name: "Omslag, Werkplaats voor Duurzame Ontwikkeling",
					src: "http://www.omslag.nl"
				}
			}
			]
		}

		participationLayer = new L.geoJson(participation_GeoJson
			, {
                      onEachFeature:onEachParticipationFeature
                    , pointToLayer: function (feature, latlng) {
                        return L.marker(latlng, { icon: markers.usersMarker} );
                        }
                }
		);

		function onEachParticipationFeature (feature, layer) {
            // does this feature have a property named popupContent?
            if (feature.properties && feature.properties.name) {
                layer.bindPopup(feature.properties.name );
            }

			(function(layer, properties) {
				// Create a mouseover event
      			layer.on("mouseover", function (e) {
					this.openPopup();

/*
        			// Create a popup with a unique ID linked to this record
					var popup 	= document.createElement('div');
					popup.id 	= 'popup-' + properties.id;
					popup.style.position = 'absolute';
					popup.style.bottom = '85px';
					popup.style.left = '50px';
					popup.style.zIndex = 1002;
					popup.style.backgroundColor = 'white';
					popup.style.padding = '8px';
					popup.style.border = '1px solid #ccc';
        			// Insert a headline into that popup
					var head = document.createElement('div');
					var _innerHtml = properties.name;
					head.innerHTML = _innerHtml;
					head.style.fontSize = '16px';
					head.style.marginBottom = '3px';
					popup.appendChild(head);
					mapPanes.popupPane.appendChild(popup);
*/
				});

      			layer.on("click", function (e) {
//					var uStreamElement = document.getElementById('ustream');
//					if ( uStreamElement == null ) {
//						initUStream(uStreamHtml, e.target.feature);
//					}
				});

      			// Create a mouseout event that undoes the mouseover changes
      			layer.on("mouseout", function (e) {
					this.closePopup();
					//document.getElementById('popup-' + properties.id).remove();
      			});
      			// Close the "anonymous" wrapper function, and call it while passing
      			// in the variables necessary to make the events work the way we want.
			})(layer, feature.properties);
        }


		// Local products
		var localProducts_GeoJson = {
			"type": "FeatureCollection",
			"features": [ {
				"type": "Feature",
				"geometry": {
					"type": "Point",
					"coordinates": [ 5.4859, 51.47552 ]
				},
				"properties": {
					id: "VleesrokerijReijnders",
					name: "VleesrokerijReijnders",
					desc: "Naam: Herderham van Vleesrokerij Reinders \
Adres: Jericholaan 22 \
5625 TH \
Eindhoven \
E-mail: info@herderham.com \
Categorie: vlees en vleesproducten. \
Herderham is een natuurlijk gedroogde ham van het schaap. Deze schapen hebben dijken, uiterwaarden, heidevelden en andere natuurterreinen begraasd onder leiding van een herder en zijn hond. Een eerlijk product, ambachtelijk in Eindhoven bereid. Puur Natuur uit Nederland. Herderham is verrassend zacht en vol van smaak. Het eigen karakter is een bron van culinaire inspiratie. De natuur is één grote kruidentuin van duizenden smaken. Dit immense pallet schuilt in Herderham. Deze ambachtelijke ham is met en zonder been verkrijgbaar. Een streekproduct met een verhaal: via de unieke code op de verpakking kunt u via onze website traceren wie de herder was en waar zijn kudde graasde! Te bestellen via onze website. ",
					src: "http://www.herderham.com"
				}
			},
			{
				"type": "Feature",
				"geometry": {
					"type": "Point",
					"coordinates": [ 5.47442, 51.42074 ]
				},
				"properties": {
					id: "GenneperHoeve",
					name: "Genneper Hoeve",
					desc: "Adres: Tongelreeppad 1 \
5644 RZ \
Eindhoven \
Tel: 040-2070455 \
E-mail: info@genneperhoeve.nl \
Categorie: vlees en vleesproducten, overige, groenten, fruit en fruitproducten, zuivel en eieren. \
Biologische stadsboerderij met koeien, kippen, varkens, educatie, natuurbeheer, zorgverlening, boerderijwinkel, tuinbouw, kaasmakerij, volledige publieksopenstelling van het erf 7 dagen in de week. Van eigen erf: biologische rauwmelkse kaas, eieren, vlees, groenten. Van biologische collega's: kruiden, meel, sap, jam, geitenkaas, schapenkaas, notenpasta, appelstroop en nog veel meer!",
					src: "http://www.genneperhoeve.nl"
				}
			},
			{
				"type": "Feature",
				"geometry": {
					"type": "Point",
					"coordinates": [ 5.35215, 51.41713 ]
				},
				"properties": {
					id: "Geitenboerke",
					name: "Geitenboerke",
					desc: "Adres: Toterfout 13 \
5507 RD \
Oerle (Veldhoven) \
Tel: 040 2053110 \
E-mail: info@geitenboerke.nl \
Categorie: zuivel en eieren. \
Op ons bedrijf houden wij een 600 melkgeiten. De melk van onze geiten wordt verwerkt tot kaas, ijs en likeur, welke wij verkopen in onze winkel.",
					src: "http://www.geitenboerke.nl"
				}
			}

			]
		}

		localProductsLayer = new L.geoJson(localProducts_GeoJson
			, {
                      onEachFeature:onEachLocalProductFeature
                    , pointToLayer: function (feature, latlng) {
                        return L.marker(latlng, { icon: markers.localProductMarker} );
                        }
                }
		);

		function onEachLocalProductFeature (feature, layer) {
            // does this feature have a property named popupContent?
            if (feature.properties && feature.properties.name) {
                layer.bindPopup(feature.properties.name );
            }

			(function(layer, properties) {
				// Create a mouseover event
      			layer.on("mouseover", function (e) {
					this.openPopup();

/*
        			// Create a popup with a unique ID linked to this record
					var popup 	= document.createElement('div');
					popup.id 	= 'popup-' + properties.id;
					popup.style.position = 'absolute';
					popup.style.bottom = '85px';
					popup.style.left = '50px';
					popup.style.zIndex = 1002;
					popup.style.backgroundColor = 'white';
					popup.style.padding = '8px';
					popup.style.border = '1px solid #ccc';
        			// Insert a headline into that popup
					var head = document.createElement('div');
					var _innerHtml = properties.name;
					head.innerHTML = _innerHtml;
					head.style.fontSize = '16px';
					head.style.marginBottom = '3px';
					popup.appendChild(head);
					mapPanes.popupPane.appendChild(popup);
*/
				});

      			layer.on("click", function (e) {
//					var uStreamElement = document.getElementById('ustream');
//					if ( uStreamElement == null ) {
//						initUStream(uStreamHtml, e.target.feature);
//					}
				});

      			// Create a mouseout event that undoes the mouseover changes
      			layer.on("mouseout", function (e) {
					this.closePopup();
					//document.getElementById('popup-' + properties.id).remove();
      			});
      			// Close the "anonymous" wrapper function, and call it while passing
      			// in the variables necessary to make the events work the way we want.
			})(layer, feature.properties);
        }


		// Parking
		var parking_GeoJson = {
			"type": "FeatureCollection",
			"features": [ {
				"type": "Feature",
				"geometry": {
					"type": "Point",
					"coordinates": [ 5.42368, 51.43565 ]
				},
				"properties": {
					id: "EindhovenMeerhoven",
					name: "Eindhoven Meerhoven",
					desc: "Tarieven \
€ 3,00 per dag \
Capaciteit \
243 parkeerplaatsen \
Vervolg per \
OV fiets, Bus \
Adres \
Slifferstestraat 340 \
5657AS Eindhoven",
					src: "http://www.anwb.nl/p-en-r/"
				}
			},
			{
				"type": "Feature",
				"geometry": {
					"type": "Point",
					"coordinates": [ 5.48291, 51.44215 ]
				},
				"properties": {
					id: "EindhovenCS",
					name: "Eindhoven CS",
					desc: "Tarieven \
€ 1,10 per uur, € 5,30 per dag \
Capaciteit \
400 parkeerplaatsen \
Vervolg per \
Trein, Bus \
Adres \
Fuutlaan \
5611 Eindhoven",
					src: "http://www.anwb.nl/p-en-r/"
				}
			},
			{
				"type": "Feature",
				"geometry": {
					"type": "Point",
					"coordinates": [ 5.39093, 51.5086 ]
				},
				"properties": {
					id: "Best",
					name: "Best",
					desc: "Tarieven \
Gratis \
Capaciteit \
200 parkeerplaatsen \
Vervolg per \
OV fiets, Trein, Bus \
Adres \
Spoorstraat 10 \
5684 Best",
					src: "http://www.anwb.nl/p-en-r/"
				}
			},
			{
				"type": "Feature",
				"geometry": {
					"type": "Point",
					"coordinates": [ 5.55042, 51.42052 ]
				},
				"properties": {
					id: "Geldrop",
					name: "Geldrop",
					desc: "Tarieven \
Gratis \
Capaciteit \
40 parkeerplaatsen \
Vervolg per \
Trein \
Adres \
Parellelweg 26 \
5664 Geldrop",
					src: "http://www.anwb.nl/p-en-r/"
				}
			}


			]
		}

		parkingLayer = new L.geoJson(parking_GeoJson
			, {
                      onEachFeature:onEachParkingFeature
                    , pointToLayer: function (feature, latlng) {
                        return L.marker(latlng, { icon: parkingIcon} );
                        }
                }
		);

		function onEachParkingFeature (feature, layer) {
            // does this feature have a property named popupContent?
            if (feature.properties && feature.properties.name) {
                layer.bindPopup(feature.properties.name );
            }

			(function(layer, properties) {
				// Create a mouseover event
      			layer.on("mouseover", function (e) {
					this.openPopup();

/*
        			// Create a popup with a unique ID linked to this record
					var popup 	= document.createElement('div');
					popup.id 	= 'popup-' + properties.id;
					popup.style.position = 'absolute';
					popup.style.bottom = '85px';
					popup.style.left = '50px';
					popup.style.zIndex = 1002;
					popup.style.backgroundColor = 'white';
					popup.style.padding = '8px';
					popup.style.border = '1px solid #ccc';
        			// Insert a headline into that popup
					var head = document.createElement('div');
					var _innerHtml = properties.name;
					head.innerHTML = _innerHtml;
					head.style.fontSize = '16px';
					head.style.marginBottom = '3px';
					popup.appendChild(head);
					mapPanes.popupPane.appendChild(popup);
*/
				});

      			layer.on("click", function (e) {
//					var uStreamElement = document.getElementById('ustream');
//					if ( uStreamElement == null ) {
//						initUStream(uStreamHtml, e.target.feature);
//					}
				});

      			// Create a mouseout event that undoes the mouseover changes
      			layer.on("mouseout", function (e) {
					this.closePopup();
					//document.getElementById('popup-' + properties.id).remove();
      			});
      			// Close the "anonymous" wrapper function, and call it while passing
      			// in the variables necessary to make the events work the way we want.
			})(layer, feature.properties);
        }



		// video camera
		var solutions_GeoJson = {
			"type": "FeatureCollection",
			"features": [
			{
				"type": "Feature",
				"geometry": {
					"type": "Point",
					"coordinates": [ 5.4531, 51.40495 ]
				},
				"properties": {
					id: "LokaleProducten",
					name: "Anders eten: kies voor lokale producten",
					desc: "De Stichting Foodculture Group wil de food-en agrosector aanzetten met vanzelfsprekende aandacht voor consument, landschap en natuur. Duurzaamheid is daarbij een leidend principe met aandacht voor 5 P’s: people (sociale kwaliteit), planet (ecologische kwaliteit), profit (economische kwaliteit), project (ruimtelijke kwaliteit) en pleasure (plezier van mensen). http://www.foodculture.nl/ en http://www.regioproduct.nl/",
					src: "http://www.regioproduct.nl/"
				}
			},
			{
				"type": "Feature",
				"geometry": {
					"type": "Point",
					"coordinates": [ 5.4531, 51.41495 ]
				},
				"properties": {
					id: "1",
					name: "Anders eten: word flexitarier",
					desc: "Vlees is lekker, maar heeft ook een keerzijde. De consumptie van één kilo Nederlands rundvlees veroorzaakt de CO2-uitstoot van 169 autokilometers. Er is \
wereldwijd veel milieuwinst te boeken als mensen wat \
minder vlees gaan eten. Gelukkig past dit in een trend: \
tweederde van de Nederlanders vindt elke dag vlees \
‘meer luxe dan noodzaak’. Mensen zijn nieuwsgierig \
naar plantaardige alternatieven omdat die gezonder \
zijn en omdat ze gevarieerd eten lekkerder vinden. \
Flexitariërs, mensen die een of meer dagen in de week \
geen vlees eten, worden nu nog gebrekkig bediend \
door de markt en daardoor eten ze minder duurzaam \
en gezond dan ze zouden willen en kunnen. Winkelbedrijven, \
restaurants en toeleveranciers kunnen bijdragen \
aan de gezondheid van mensen en het milieu als ze \
beter in weten te spelen op de wensen van de flexitariër. \
De overheid kan samen met bedrijven ervoor zorgen \
dat Nederland de belangrijkste testmarkt in de wereld \
wordt voor innovatieve plantaardige eiwitproducten. \
Voor deze innovatieve ontwikkeling is het noodzakelijk \
dat het btw-tarief van vlees wordt verhoogd. Zie ook: \
www.flexitarier.nl",
					src: "http://www.natuurenmilieu.nl/media/278298/20111012-natuur_milieu-rapport-rankingthestars.pdf"
				}
			},
			{
				"type": "Feature",
				"geometry": {
					"type": "Point",
					"coordinates": [ 5.4531, 51.42495 ]
				},
				"properties": {
					id: "2",
					name: "Power to the people",
					desc: "De geschiedenis leert dat nieuwe technieken niet \
komen van de gevestigde orde. Zo kwam de doorbraak \
van de luchtvaart niet tot stand door spoorwegmaatschappijen. \
Net zo goed mogen we niet verwachten dat \
gevestigde energiebedrijven de energietransitie leiden. \
Steeds meer mensen gaan hun eigen duurzame energie \
opwekken en onderling uitwisselen. Mensen zullen \
met behulp van slimme meters communities vormen en \
een sport maken van energiebesparing. Mensen zullen \
door zelf stroom te maken ook een speler worden \
op energiemarkten. De overheid kan deze trend van \
‘power to the people’ faciliteren door: \
•	 Investeren in smart-grids en zelflevering maximaal \
fiscaal te ondersteunen. In sommige plaatsen in \
Duitsland kunnen burgers soms hun zonnestroom \
nu al niet kwijt omdat het lokale net overbelast is. \
Tijdig investeren in smart grids is nodig omdat de \
energierevolutie van rendabele lokale energie binnen \
handbereik ligt. Zie ook: www.zonzoektdak.nl \
•	 Een kolenbelasting of CO2-norm voor kolencentrales \
in te voeren. Kolencentrales kunnen moeilijk inspelen \
op wisselende lokale energieproductie en hebben \
een tegengesteld belang. Nederland is nu al nettoexporteur \
van stroom (TenneT, 2011), terwijl de \
nieuwe geplande kolencentrales nog in bedrijf moeten \
komen. Meer kolenstroom betekent meer export, terwijl \
mensen in Nederland blijven zitten met de lokale \
milieuverontreiniging en de kosten daarvan.",
					src: "http://www.natuurenmilieu.nl/media/278298/20111012-natuur_milieu-rapport-rankingthestars.pdf"
				}
			},
			{
				"type": "Feature",
				"geometry": {
					"type": "Point",
					"coordinates": [ 5.4531, 51.43495 ]
				},
				"properties": {
					id: "3",
					name: "Het Nieuwe Werken",
					desc: "Nederlanders maken de meeste woon-werk en zakelijke \
kilometers van Europa. Het Nieuwe Werken (HNW) past \
bij de wensen van mensen en ondernemingen, leidt tot \
minder files en autokilometers en bespaart fors op verkeersemissies. \
Fiscaal kan HNW worden gestimuleerd \
door de belastingvrijstelling voor reiskostenvergoeding \
tot € 0,19 per kilometer af te schaffen. De schatkist en \
dus de belastingbetaler is nu jaarlijks 1,7 miljard euro \
kwijt aan deze regeling. In plaats daarvan kan dit bedrag \
worden teruggesluisd naar de beroepsbevolking. Dan \
gaat niet meer het merendeel van de 1,7 miljard euro \
als subsidie naar de mensen die het verst van hun werk \
wonen, maar krijgt iedereen ieder jaar een mobiliteitstoeslag \
van € 200,-. Nederlandse werknemers hebben \
dan nog steeds een voorkeurspositie aangezien Nederland \
het enige land is die reiskostenvergoedingen fiscaal \
vrijstelt.Door deze fiscale aanpassing worden vormen \
van HNW en dichter bij het werk wonen beloond. Zie \
ook: www.hetnieuwewerkendoejezelf.nl",
					src: "http://www.natuurenmilieu.nl/media/278298/20111012-natuur_milieu-rapport-rankingthestars.pdf"
				}
			},
			{
				"type": "Feature",
				"geometry": {
					"type": "Point",
					"coordinates": [ 5.4531, 51.44495 ]
				},
				"properties": {
					id: "4",
					name: "Duurzame veehouderij",
					desc: "Uit de maatschappelijke dialoog over schaalgrootte en \
toekomstvandeveehouderij onder leiding van de heer \
Alders blijkt dat business-as-usualvoor de intensieve \
veehouderij geenoptie meer is. Alle betrokkenenpleiten \
voor een gemeenschappelijke visie op een duurzame \
veehouderij met concrete doelenentijdspaden(‘eenstip \
op de horizon’). Een onmisbaar element van de duurzame \
veehouderij is het sluiten van mineralenkringlopen zodat \
emissies van fosfaten, stikstof en ammoniak naar bodem, \
water en lucht aanzienlijk zullen afnemen. Om deze oplossing \
te bereiken zijn de volgende maatregelen nodig: \
•	 Met minder dieren betere producten produceren \
en voor een eerlijke prijs verkopen. Investeren in \
hoogwaardige producten die goed zijn voor de volksgezondheid \
in plaats van investeren in laagwaardige kiloknallers. \
•	 Het verplichten van de mestverwerking. Hierdoor \
wordt productie van biogas en hergebruik van meststoffen \
de norm zonder dat er nog subsidies nodig zijn. \
•	 Het invoeren van een fosfaatbelasting op fosfaatkunstmest. \
Dit verbetert de businesscase van \
nieuwe innovatieve technologie die het hergebruik \
van fosfaten uit dierlijke mest mogelijk maakt. \
•	 Eerlijk verdelen van schaarse ruimte. Schone lucht \
en waardevolle natuur zijn in Nederland een schaars \
goed. Zeker in gebieden zoals Noord Brabant waar \
veel dieren opeengepakt leven. Een Autoriteit \
Milieugebruiksruimte Veehouderij (noot 4)kan de \
schaarse ruimte eerlijk verdelen, zonder meerkosten \
voor de boer. Waar verouderde boerenbedrijven verdwijnen, \
krijgen moderne schone boerenbedrijven \
de ruimte om uit te breiden. ",
					src: "http://www.natuurenmilieu.nl/media/278298/20111012-natuur_milieu-rapport-rankingthestars.pdf"
				}
			},
						{
				"type": "Feature",
				"geometry": {
					"type": "Point",
					"coordinates": [ 5.4531, 51.45495 ]
				},
				"properties": {
					id: "5",
					name: "Alles van waarde is weerloos",
					desc: "Alles van waarde is weerloos’, zo dichtte Lucebert \
in de jaren ’50 van de vorige eeuw. Dit lijkt zeker van \
toepassing op de bezuiniging van 75 procent op het \
natuurbudget door het kabinet Rutte. Nederland loopt \
sterk achter in Europa wat betreft het beschermen \
van natuur en natuurgebieden. Het is begrijpelijk dat \
ook van het natuurbudget bezuinigingen gevraagd \
worden, maar niet zo disproportioneel zoals momenteel \
voorgesteld. Wij pleiten voor het handhaven van \
de Ecologische Hoofdstructuur (EHS) in oorspronkelijke \
vorm en oppervlakte van 700.000 hectare. Een \
bezuiniging is haalbaar door het realiseren van de EHS \
te verlaten van 2018 naar 2021.",
					src: "http://www.natuurenmilieu.nl/media/278298/20111012-natuur_milieu-rapport-rankingthestars.pdf"
				}
			},
			{
				"type": "Feature",
				"geometry": {
					"type": "Point",
					"coordinates": [ 5.4531, 51.46495 ]
				},
				"properties": {
					id: "6",
					name: "Prijs iedere reis",
					desc: "Verkeersemissies zijn een belangrijke oorzaak voor \
meerdere milieuproblemen in Nederland. Neem \
daarom maatregelen die schoner en efficiënter vervoer \
bevorderen, maar ook het aantal voertuigkilometers \
in Nederland beperken. Dit kan door, in navolging van vele andere Europese landen, zoals Duitsland (zie ook \
figuur 4), een kilometerprijs voor het vrachtverkeer \
over de weg in te voeren. \
Vliegverkeer en scheepvaart dragen onevenredig \
veel bij aan lokale luchtverontreiniging, in de vorm \
van uitstoot van NOx en stofdeeltjes. In navolging van \
andere Europese landen zoals Engeland, Zwitserland \
en Zweden kunnen de landingsgelden en/of havengelden \
gedifferentieerd worden op basis van milieukenmerken, \
zodat de lucht- en scheepvaartsector \
gestimuleerd worden om alleen met de schoonste en \
zuinigste vaartuigen in de Nederlandse (lucht)havens \
aan te komen. ",
					src: "http://www.natuurenmilieu.nl/media/278298/20111012-natuur_milieu-rapport-rankingthestars.pdf"
				}
			},
			{
				"type": "Feature",
				"geometry": {
					"type": "Point",
					"coordinates": [ 5.4531, 51.47495 ]
				},
				"properties": {
					id: "7",
					name: "Zeekracht: de Noordzee als duurzame energiebron",
					desc: "Nederland kan de Europese verplichting van 14% \
duurzame energie in 2020 alleen halen als in deze \
kabinetsperiode een ‘stopcontact op zee’ en 3.000 MW \
windparken op zee worden aanbesteed. Deze urgentie \
komt doordat het ontwikkelen van nieuwe windparken \
op zee tenminste vijf jaar kost. Ook het PBL adviseert \
de regering in de Monitor Duurzaam Nederland om \
hierop in te zetten (PBL 2011). Doet deze regering dit \
niet, dan zal er in 2020 duurzame energie moeworden \
ingekocht uit het buitenland. Import van het hernieuwbare \
stroom kan in 2020 echter zeer kostbaar zijn, aangezien \
veel EU landen tegen die tijd moeten importeren, \
hetgeen de marktprijs sterk zal opdrijven. De kans \
is dus groot dat Nederland geen geld bespaart door af \
te zien van investeringen in wind op zee en tegelijkertijd \
geen sterke thuismarkt opbouwt in een nieuwe \
veelbelovende sector met innovatie- en exportkansen. \
Zie ook: www.zeekracht.nl",
					src: "http://www.natuurenmilieu.nl/media/278298/20111012-natuur_milieu-rapport-rankingthestars.pdf"
				}
			},
			{
				"type": "Feature",
				"geometry": {
					"type": "Point",
					"coordinates": [ 5.4531, 51.48495 ]
				},
				"properties": {
					id: "8",
					name: "Wordt rijker door zuinig voorop lopen",
					desc: "Als Nederland voorop loopt met energiebesparing \
verbetert de concurrentiepositie van onze economie. \
Juist als andere landen weinig doen. Bij het uitblijven \
van een mondiaal klimaatakkoord zal de vraag naar \
energie sterk blijven toenemen waardoor energieprijzen \
verder omhoog gaan. Hogere energieprijzen \
betekent dat een land dat veel aan energiebesparing \
doet veel geld uitspaart en energiebesparende investeringen \
sneller terugverdient. Het kabinet Rutte stelt \
dat energiebesparing vanuit het klimaatbeleid geen \
aparte beleidsdoelstelling is, omdat het een middel is. \
Puur vanuit economische belangen en energieveiligheid \
geredeneerd zou het juist verstandig zijn om wel \
forse energiebesparingen na te streven. Denemarken \
heeft aangetoond dat het mogelijk is om met een \
consistent beleidspakket in de periode 1980-2005 de \
economie 80% te laten groeien terwijl gelijkertijd de \
energievraag nagenoeg gelijk is gebleven (CPB, 2011). \
In Nederland is het energiegebruik in dezelfde periode \
met 1,5% per jaar gestegen.",
					src: "http://www.natuurenmilieu.nl/media/278298/20111012-natuur_milieu-rapport-rankingthestars.pdf"
				}
			},
			{
				"type": "Feature",
				"geometry": {
					"type": "Point",
					"coordinates": [ 5.4531, 51.49495 ]
				},
				"properties": {
					id: "Samen rijden",
					name: "Wordt rijker door samen te rijden",
					desc: "Op Samenrijden.nl komt vraag en aanbod van ritten samen. Door samen te rijden bespaar je niet alleen, het is ook heel gezellig en goed voor het milieu!",
					src: "http://www.samenrijden.nl/"
				}
			}

			]
		}
		solutionsLayer = new L.geoJson(solutions_GeoJson
			, {
                      onEachFeature:onEachSolutionFeature
                    , pointToLayer: function (feature, latlng) {
                        return L.marker(latlng, { icon: markers.solutionMarker} );
                        }
                }
		);

		function onEachSolutionFeature (feature, layer) {
            // does this feature have a property named popupContent?
            if (feature.properties && feature.properties.name) {
                layer.bindPopup(feature.properties.name );
            }

			(function(layer, properties) {
				// Create a mouseover event
      			layer.on("mouseover", function (e) {
					this.openPopup();

/*
        			// Create a popup with a unique ID linked to this record
					var popup 	= document.createElement('div');
					popup.id 	= 'popup-' + properties.id;
					popup.style.position = 'absolute';
					popup.style.bottom = '85px';
					popup.style.left = '50px';
					popup.style.zIndex = 1002;
					popup.style.backgroundColor = 'white';
					popup.style.padding = '8px';
					popup.style.border = '1px solid #ccc';
        			// Insert a headline into that popup
					var head = document.createElement('div');
					var _innerHtml = properties.name;
					head.innerHTML = _innerHtml;
					head.style.fontSize = '16px';
					head.style.marginBottom = '3px';
					popup.appendChild(head);
					mapPanes.popupPane.appendChild(popup);
*/
				});

      			layer.on("click", function (e) {
//					var uStreamElement = document.getElementById('ustream');
//					if ( uStreamElement == null ) {
//						initUStream(uStreamHtml, e.target.feature);
//					}
				});

      			// Create a mouseout event that undoes the mouseover changes
      			layer.on("mouseout", function (e) {
					this.closePopup();
					//document.getElementById('popup-' + properties.id).remove();
      			});
      			// Close the "anonymous" wrapper function, and call it while passing
      			// in the variables necessary to make the events work the way we want.
			})(layer, feature.properties);
        }







//        openBasisKaartLayer = L.tileLayer.wms(siteProtocol+sitePrefixExtern+"www.openbasiskaart.nl/mapcache?SRS=EPSG%3A28992", {
        openBasisKaartLayer = L.tileLayer.wms("https://www.openbasiskaart.nl/mapcache?SRS=EPSG%3A28992", {
			layers: 'osm',
            format: 'image/png',
            transparent: true,
			tiled: true,
		//	tilesorigin: [-180, 90],
			//crs: L.CRS.EPSG28992,    //
			//srs: 'EPSG:28992',
			crs : RDcrs,
            attribution: "osm/obk "
        });
//        openBasisKaartLayer.addTo(map);

		var osmUrl='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
  		var osmAttrib='Map data © <a href="http://openstreetmap.org">OpenStreetMap</a> contributors';
  		osmKaartLayer = new L.TileLayer(osmUrl, {
  		//minZoom: 8, maxZoom: 18,
  		attribution: osmAttrib});
  		osmKaartLayer.addTo(map);

/*
        osmKaartLayer = L.tileLayer.wms("http://129.206.228.72/cached/osm?", {
//        osmKaartLayer = L.tileLayer.wms("http://c.tile.openstreetmap.org/osm", {
//		osmKaartLayer = L.tileLayer.wms("http://c.tile.openstreetmap.org/osm", {
			layers: 'osm_auto:all',
            format: 'image/png',
            transparent: true,
			tiled: false,
		//	tilesorigin: [-180, 90],
			//crs: L.CRS.EPSG28992,    //
			//srs: 'EPSG:28992',
//			crs : RDcrs,
//			crs: L.CRS.EPSG4326,
			srs: 'EPSG:900913',
            attribution: "osm/obk "
        });
        osmKaartLayer.addTo(map);
*/




	// update from http://82.201.127.232:8080/web/js/adressenEindhoven.js
/*
var Addresses = {
	'1.cal': { adres: "Eij-erven", voorv: "", pcw: "5646 JM" },
	'2.cal': { adres: "Lijmbeekstraat", voorv: "", pcw: "5612 NJ" },
	'3.cal': { adres: "Keizersgracht", voorv: "", pcw: "5611 GD" },
	'4.cal': { adres: "Weberstraat-Limburglaan", voorv: "X v.", pcw: "5653 AD" },
	'5.cal': { adres: "Falstaff", voorv: "", pcw: "5629 NK" },
	'6.cal': { adres: "Grote Beerlaan", voorv: "", pcw: "5632 DN" },
	'7.cal': { adres: "Botenlaan", voorv: "", pcw: "5616 JG" },
	'8.cal': { adres: "Leenderweg", voorv: "", pcw: "5643 AJ" },
	'9.cal': { adres: "Maasteikstraat", voorv: "", pcw: "5628 PZ" },
	'11.cal': { adres: "Leostraat", voorv: "", pcw: "5644 PA" },
	'12.cal': { adres: "Jan Hollanderstraat", voorv: "", pcw: "5654 DT" },
	'13.cal': { adres: "Sliffertsestraat", voorv: "", pcw: "5657 AR" },
	'14.cal': { adres: "Twickel", voorv: "", pcw: "5655 JJ" },
	'15.cal': { adres: "Kasteel-traverse", voorv: "", pcw: "5701 NR Helmond" },
	'16.cal': { adres: "Beukenlaan", voorv: "", pcw: "5651 CD" },
	'17.cal': { adres: "Amstelstraat", voorv: "", pcw: "5626 BN" },
	'18.cal': { adres: "Strijp R", voorv: "", pcw: "" },
	'19.cal': { adres: "Finisterelaan", voorv: "", pcw: "5627 TE" },
	'20.cal': { adres: "Sperwerlaan", voorv: "", pcw: "5613 EE" },
	'21.cal': { adres: "Donk", voorv: "", pcw: "5641 PX" },
	'22.cal': { adres: "Hofstraat", voorv: "", pcw: "5504 GD" },
	'23.cal': { adres: "Jeroen Boschlaan", voorv: "", pcw: "5613 GC" },
	'24.cal': { adres: "Vollenhovenstraat", voorv: "v.", pcw: "5652 SN" },
	'25.cal': { adres: "Mauritsstraat", voorv: "(tegenover)", pcw: "5616 AB" },
	'26.cal': { adres: "Gedempte gracht / Vestdijk", voorv: "", pcw: "5611 DM" },
	'27.cal': { adres: "Sint Adrianusstraat", voorv: "", pcw: "5614 EP" },
	'28.cal': { adres: "Rijckwaertstraat", voorv: "", pcw: "5622 HV" },
	'29.cal': { adres: "Fliednerstraat", voorv: "Ds.", pcw: "5631 BN" },
	'30.cal': { adres: "Spijndhof", voorv: "", pcw: "5611 HV" },
	'31.cal': { adres: "Vincent Cleerdinlaan", voorv: "", pcw: "5582 EJ Waalre" },
	'32.cal': { adres: "Vesaliuslaan", voorv: "", pcw: "5644 HL" },
	'33.cal': { adres: "Moving airbox", voorv: "", pcw: "0000 AA" },
	'34.cal': { adres: "Pastoriestraat", voorv: "", pcw: "5612 EJ" },
	'35.cal': { adres: "Boschdijk", voorv: "", pcw: "5621 JC" },
	'36.cal': { adres: "Hudsonlaan / Kennedylaan", voorv: "", pcw: "5623 NR" },
	'37.cal': { adres: "Genovevalaan", voorv: "", pcw: "5625 EA" },
	'39.cal': { adres: "Noord-Brabantlaan", voorv: "", pcw: "5651 LZ" },
	'40.cal': { adres: "Zwijgerstraat", voorv: "Willem de", pcw: "5616 AC" }
}
*/




// ===============   AiREAS WMS puntmetingen start




var createGraphicTrend = function(result, options) {
	var i,
		inpRecord, outRecord,
		data=[];
	var jsonResponse = JSON.parse(result);

	// postgres averages
	if (jsonResponse[0] && jsonResponse[0].hist_year ) {
		for(i=0;i<jsonResponse.length;i++) {
			inpRecord = jsonResponse[i];
			outRecord = {};
			//outRecord['date'] 	= new Date();
			//outRecord.date.setFullYear(inpRecord.hist_year, inpRecord.hist_month, 1);
			var _date = new Date(inpRecord.hist_year, inpRecord.hist_month-1, 1);
			outRecord.date = _date;

			if (data[data.length-1] && data[data.length-1].date.getTime() == _date.getTime() ) {
				if (inpRecord.avg_type == 'PM1') {
					data[data.length-1].PM1 	= inpRecord.avg_avg;
				}
				if (inpRecord.avg_type == 'PM25') {
					data[data.length-1].PM25 	= inpRecord.avg_avg;
				}
				if (inpRecord.avg_type == 'PM10') {
					data[data.length-1].PM10 	= inpRecord.avg_avg;
				}
			} else {
				if (inpRecord.avg_type == 'PM1') {
					outRecord.PM1 	= inpRecord.avg_avg;
				}
				if (inpRecord.avg_type == 'PM25') {
					outRecord.PM25 	= inpRecord.avg_avg;
				}
				if (inpRecord.avg_type == 'PM10') {
					outRecord.PM10 	= inpRecord.avg_avg;
				}
				data.push(outRecord);
			}

			//outRecord.SPMI 		= inpRecord.avgSPMI;
//			outRecord.CELC 		= inpRecord.avgCELC;
//			outRecord.NO2 		= inpRecord.avgNO2;
			//outRecord.HUM 		= inpRecord.avgHUM;
			//outRecord.UFP 		= inpRecord.avgUFP;
			//outRecord.OZON 		= inpRecord.avgOZON;

		}


	}

/* mongodb variant
	for(i=0;i<jsonResponse.length;i++) {
		inpRecord = jsonResponse[i];
		outRecord = {};
		outRecord['date'] 	= new Date();
		outRecord.date.setFullYear(inpRecord._id.year, inpRecord._id.month - 1, 1);
		outRecord.PM1 		= inpRecord.avgPM1;
		outRecord.PM25 		= inpRecord.avgPM25;
		outRecord.PM10 		= inpRecord.avgPM10;
		//outRecord.SPMI 		= inpRecord.avgSPMI;
		outRecord.CELC 		= inpRecord.avgCELC;
		outRecord.NO2 		= inpRecord.avgNO2;
		//outRecord.HUM 		= inpRecord.avgHUM;
		//outRecord.UFP 		= inpRecord.avgUFP;
		//outRecord.OZON 		= inpRecord.avgOZON;

		data.push(outRecord);
	}
*/
	var graphicTrend;
	graphicTrend = new ApriD3GraphicTrend();
	graphicTrend.createGraphic(data, options);
	graphicTrend.render();
}

var createGraphicGroupedHorBar = function(result, options) {
	var i, key,
		inpRecord, outRecord,
		data={};
	var jsonResponse = JSON.parse(result);

	var _datalabels = {};
	data.labels = [];

	for (i=0;i<jsonResponse.length;i++) {
		if (jsonResponse[i].avg_type != _datalabels[jsonResponse[i].avg_type]) {
			_datalabels[jsonResponse[i].avg_type]="";
		}
//		 for (key in jsonResponse[0]) {
//			if (key != "_id" && key != "avgUFP" && key != "avgOZON") {
//				data.labels.push(key);
//			}
//		}
	}

	for (key in _datalabels) {
		//if (key !=  key != "avgUFP" && key != "avgOZON") {
			data.labels.push(key);
		//}
	}

	var _years = {}

	data.series=[];
	for(i=0;i<jsonResponse.length;i++) {
		inpRecord = jsonResponse[i];
		if (_years[inpRecord.hist_year.toString()] == undefined ) {
			_years[inpRecord.hist_year.toString()] = {};
			for (key in _datalabels) {
				_years[inpRecord.hist_year.toString()][key]=0;
			}
		}
		_years[inpRecord.hist_year.toString()][inpRecord.avg_type]=inpRecord.avg_avg;
	}

	for (var _year in _years) {
		outRecord = {};
		outRecord.label = _year;
		outRecord.values = [];
		for (key in _years[_year]) {
			//if (key != "_id" && key != "avgUFP" && key != "avgOZON") {
				outRecord.values.push(Math.round(_years[_year][key]));
			//}
		}
		data.series.push(outRecord);
	}

/* mongodb variant:
	data.labels=[];
	for (key in jsonResponse[0]) {
		if (key != "_id" && key != "avgUFP" && key != "avgOZON") {
			data.labels.push(key);
		}
	}
	data.series=[];
	for(i=0;i<jsonResponse.length;i++) {
		inpRecord = jsonResponse[i];
		outRecord = {};
		outRecord.label = inpRecord._id.year.toString();
		outRecord.values = [];
		for (key in inpRecord) {
			if (key != "_id" && key != "avgUFP" && key != "avgOZON") {
				outRecord.values.push(Math.round(inpRecord[key]));
			}
		}
		data.series.push(outRecord);
	}
*/
	var graphicGroupHorBar;
	graphicGroupHorBar = new ApriD3GraphicGroupedHorBar();
	graphicGroupHorBar.createGraphic(data, options);
	graphicGroupHorBar.render();
}





//==================== ajax call for AiREAS measure data
	function ajaxCall (options, callback) {

		var xmlhttp;
		xmlhttp=new XMLHttpRequest();

		var url = options.url;

		xmlhttp.onreadystatechange=function() {
		    var i, inpRecord, outRecord, data=[];
  			if (xmlhttp.readyState==4 && xmlhttp.status==200) {
			    //var jsonResponse = JSON.parse(xmlhttp.responseText);

				callback(xmlhttp.responseText, options);
			}
  		}
		xmlhttp.open("GET",url,true);
		xmlhttp.send();
	}







////////////////////////////

//        var pdokLuchtfotoLayer = L.tileLayer.wms(siteProtocol+sitePrefixExtern+"geodata1.nationaalgeoregister.nl/luchtfoto/wms", {
        pdokLuchtfotoLayer = L.tileLayer.wms("http://geodata1.nationaalgeoregister.nl/luchtfoto/wms", {
			layers: 'luchtfoto_png',
            format: 'image/png',
            transparent: true,
		//	tiled: true,
	//		crs : RDcrs,
			crs: L.CRS.EPSG4326,
			version: '1.3.0',
            attribution: "PDOK/Luchtfoto "
			// ,bounds: bounds
        });

/*
        aireasWMSPuntMetingenLayer = L.tileLayer.betterWms("https://scapeler.com/geoserver/scapeler/wms", {  //c5v511
 //       var aireasWMSPuntMetingenLayer = new L.SingleTile("https://scapeler.com/geoserver/scapeler/wms", {  //c5v511
        // ?service=WMS&version=1.1.0&bbox=123657.03125,499459.625,129679.1328125,504556.78125&width=512&height=433&srs=EPSG:28992&format=
            layers: 'scapeler:aireas',
            format: 'image/png',
            transparent: true,
			tiled: true,
			styles: "point",
		//	tilesorigin: [-180, 90],
			//crs: new L.CRS.EPSG4326, //	 'EPSG:4326',
			crs: RDcrs, //L.CRS('EPSG:28992'),
            attribution: "AiREAS",
			popupView: _popupView,
			name: "aireasWMSPuntMetingenLayer"
        });
*/


		// BAG PDOK http://geodata.nationaalgeoregister.nl/bagviewer/wms?request=getcapabilities
		PDOK_BAG_verblijfsobject_Layer = L.tileLayer.wms(siteProtocol+sitePrefixExtern+"geodata.nationaalgeoregister.nl/bagviewer/wms", {
        // ?service=WMS&version=1.1.0&bbox=123657.03125,499459.625,129679.1328125,504556.78125&width=512&height=433&srs=EPSG:28992&format=
            layers: 'verblijfsobject',
            format: 'image/png',
            transparent: true,
			tiled: true,
        //    crs: RDcrs,
            crs: L.CRS.EPSG28992,
		//	tilesorigin: [-180, 90],
            attribution: "BAG verblijfsobject",
			zoomTo: 17
        });
		PDOK_BAG_pand_Layer = L.tileLayer.wms(siteProtocol+sitePrefixExtern+"geodata.nationaalgeoregister.nl/bagviewer/wms", {
        // ?service=WMS&version=1.1.0&bbox=123657.03125,499459.625,129679.1328125,504556.78125&width=512&height=433&srs=EPSG:28992&format=
            layers: 'pand',
            format: 'image/png',
            transparent: true,
			tiled: true,
        //    crs: RDcrs,
            crs: L.CRS.EPSG28992,
		//	tilesorigin: [-180, 90],
            attribution: "BAG pand",
			zoomTo: 17
        });

		Ahn1_5m_Layer = L.tileLayer.wms(siteProtocol+sitePrefixExtern+"geodata.nationaalgeoregister.nl/ahn1/wms", {
            layers: 'ahn1_5m',
            format: 'image/png',
            transparent: true,
			tiled: true,
            crs: RDcrs,
        //    crs: L.CRS.EPSG28992,
		//	tilesorigin: [-180, 90],
            attribution: "AHN1 5m"
        });



		EHV_OplaadPalen_Layer = L.tileLayer.wms(siteProtocol+sitePrefixExtern+"data.eindhoven.nl/api/geospatial/gpj4-aq6d", {
            layers: 'geo_gpj4-aq6d:geo_gpj4-aq6d-1',
            format: 'image/png',
            transparent: true,
			tiled: true,
            crs: RDcrs,
        //    crs: L.CRS.EPSG28992,
		//	tilesorigin: [-180, 90],
            attribution: "EHV_Oplaadpalen"
        });


		EHV_BeeldBepalendGroen_Layer = L.tileLayer.wms(siteProtocol+sitePrefixExtern+"gisservice.eindhoven.nl/arcgis/services/EHV_Groenbeeldbepalend/MapServer/WMSServer", {
            layers: '0',
            format: 'image/png',
            transparent: true,
			tiled: true,
            crs: RDcrs,
        //    crs: L.CRS.EPSG28992,
		//	tilesorigin: [-180, 90],
            attribution: "EHV_BeeldBepalendGroen"
        });

		EHV_Bomen_Layer = L.tileLayer.wms(siteProtocol+sitePrefixExtern+"data.eindhoven.nl/api/geospatial/x2es-x3gg", {
            layers: 'geo_x2es-x3gg:geo_x2es-x3gg-1',
            format: 'image/png',
            transparent: true,
			tiled: true,
        //    crs: RDcrs,
        //    crs: L.CRS.EPSG28992,
		//	tilesorigin: [-180, 90],
            attribution: "EHV_Bomen"
        });

		EHV_Luchtkwaliteit_Layer = L.tileLayer.wms(siteProtocol+sitePrefixExtern+"gisservice.eindhoven.nl/arcgis/services/EHV_Luchtkwaliteit/MapServer/WMSServer", {
            layers: '0',
            format: 'image/png',
            transparent: true,
			tiled: true,
            crs: RDcrs,
        //    crs: L.CRS.EPSG28992,
		//	tilesorigin: [-180, 90],
            attribution: "EHV_Luchtkwaliteit"
        });

		EHV_FaunaPoelen_Layer = L.tileLayer.wms(siteProtocol+sitePrefixExtern+"data.eindhoven.nl/api/geospatial/r2eh-qc33", {
            layers: 'geo_r2eh-qc33:geo_r2eh-qc33-1',
            format: 'image/png',
            transparent: true,
			tiled: true,
        //    crs: RDcrs,
        //    crs: L.CRS.EPSG28992,
		//	tilesorigin: [-180, 90],
            attribution: "EHV_Faunapoelen"
        });

		EHV_Landschap_Layer = L.tileLayer.wms(siteProtocol+sitePrefixExtern+"gisservice.eindhoven.nl/arcgis/services/EHV_Cultuurhistorie/MapServer/WMSServer", {
            layers: '1',
            format: 'image/png',
            transparent: true,
			tiled: true,
        //    crs: RDcrs,
        //    crs: L.CRS.EPSG28992,
		//	tilesorigin: [-180, 90],
            attribution: "EHV_Landschap"
        });

		EHV_StedebouwkundigGebied_Layer = L.tileLayer.wms(siteProtocol+sitePrefixExtern+"gisservice.eindhoven.nl/arcgis/services/EHV_Cultuurhistorie/MapServer/WMSServer", {
            layers: '2',
            format: 'image/png',
            transparent: true,
			tiled: true,
        //    crs: RDcrs,
        //    crs: L.CRS.EPSG28992,
		//	tilesorigin: [-180, 90],
            attribution: "EHV_StedebouwkundigGebied"
        });

		EHV_Wegenstructuur_Layer = L.tileLayer.wms(siteProtocol+sitePrefixExtern+"gisservice.eindhoven.nl/arcgis/services/EHV_Cultuurhistorie/MapServer/WMSServer", {
            layers: '3',
            format: 'image/png',
            transparent: true,
			tiled: true,
        //    crs: RDcrs,
        //    crs: L.CRS.EPSG28992,
		//	tilesorigin: [-180, 90],
            attribution: "EHV_Wegenstructuur"
        });

		EHV_Vergunningen_Layer = L.tileLayer.wms(siteProtocol+sitePrefixExtern+"gisservice.eindhoven.nl/arcgis/services/EHV_Vergunningen/MapServer/WmsServer", {
            layers: '0',
            format: 'image/png',
            transparent: true,
			tiled: true,
        //    crs: RDcrs,
        //    crs: L.CRS.EPSG28992,
		//	tilesorigin: [-180, 90],
            attribution: "EHV_Vergunningen"
        });

		EHV_Lichtmasten_Layer = L.tileLayer.wms(siteProtocol+sitePrefixExtern+"data.eindhoven.nl/api/geospatial/qk2m-nv77", {
            layers: 'geo_qk2m-nv77:geo_qk2m-nv77-1',
            format: 'image/png',
            transparent: true,
			tiled: true,
        //    crs: RDcrs,
        //    crs: L.CRS.EPSG28992,
		//	tilesorigin: [-180, 90],
            attribution: "EHV_Lichtmasten"
        });


		RTD_Spelen_Layer = L.tileLayer.wms(siteProtocol+sitePrefixExtern+"ows.gis.rotterdam.nl/cgi-bin/mapserv.exe?map=d:\\gwr\\webdata\\mapserver\\map\\BBDWH_pub.map", {
            layers: 'sdo_gwr_bsb_stn_sdp_pnt',
            format: 'image/png',
            transparent: true,
			tiled: true,
            crs: RDcrs,
			version: '1.3.0',
        //    crs: L.CRS.EPSG28992,
		//	tilesorigin: [-180, 90],
            attribution: "RTD Spelen"
        });

		RTD_SpeelPlaatsen_Layer = L.tileLayer.wms(siteProtocol+sitePrefixExtern+"ows.gis.rotterdam.nl/cgi-bin/mapserv.exe?map=d:\\gwr\\webdata\\mapserver\\map\\BBDWH_pub.map", {
            layers: 'sdo_gwr_bsb_stn_sdp_pnt', //'sdo_gwr_bsb_obj_lbl', //'sdo_gwr_bsb_stn_sdp_pnt_lbl',
            format: 'image/png',
            transparent: true,
			tiled: true,
            crs: RDcrs,
			version: '1.3.0',
        //    crs: L.CRS.EPSG28992,
		//	tilesorigin: [-180, 90],
            attribution: "RTD Speelplaatsen"
        });


		RTD_BROnderhoud_Layer = L.tileLayer.wms(siteProtocol+sitePrefixExtern+"ows.gis.rotterdam.nl/cgi-bin/mapserv.exe?map=d:\\gwr\\webdata\\mapserver\\map\\BBDWH_pub.map", {
            layers: 'sdo_gwr_bsb_obj_ohk',
            format: 'image/png',
            transparent: true,
			tiled: true,
            crs: RDcrs,
			version: '1.3.0',
        //    crs: L.CRS.EPSG28992,
		//	tilesorigin: [-180, 90],
            attribution: "RTD BRobjecten onderhoud"
        });

		RTD_Bomen_Layer = L.tileLayer.wms(siteProtocol+sitePrefixExtern+"ows.gis.rotterdam.nl/cgi-bin/mapserv.exe?map=d:\\gwr\\webdata\\mapserver\\map\\BBDWH_pub.map", {
            layers: 'sdo_gwr_bsb_bmn_alg',
            format: 'image/png',
            transparent: true,
			tiled: true,
            crs: RDcrs,
			version: '1.3.0',
        //    crs: L.CRS.EPSG28992,
		//	tilesorigin: [-180, 90],
            attribution: "RTD Bomen"
        });

		RTD_BouwPlaatsen_Layer = L.tileLayer.wms(siteProtocol+sitePrefixExtern+"ows.gis.rotterdam.nl/cgi-bin/mapserv.exe?map=d:\\gwr\\webdata\\mapserver\\map\\BBDWH_pub.map", {
            layers: 'sdo_gwr_bsb_bpv_vlk',
            format: 'image/png',
            transparent: true,
			tiled: true,
            crs: RDcrs,
			version: '1.3.0',
        //    crs: L.CRS.EPSG28992,
		//	tilesorigin: [-180, 90],
            attribution: "RTD Bouwplaatsen"
        });

		RTD_Verkeersborden_Layer = L.tileLayer.wms(siteProtocol+sitePrefixExtern+"ows.gis.rotterdam.nl/cgi-bin/mapserv.exe?map=d:\\gwr\\webdata\\mapserver\\map\\BBDWH_pub.map", {
            layers: 'sdo_gwr_bsb_vkb_loc',
            format: 'image/png',
            transparent: true,
			tiled: true,
            crs: RDcrs,
			version: '1.3.0',
        //    crs: L.CRS.EPSG28992,
		//	tilesorigin: [-180, 90],
            attribution: "RTD Verkeersborden"
        });

		RTD_StrNaamBorden_Layer = L.tileLayer.wms(siteProtocol+sitePrefixExtern+"ows.gis.rotterdam.nl/cgi-bin/mapserv.exe?map=d:\\gwr\\webdata\\mapserver\\map\\BBDWH_pub.map", {
            layers: 'sdo_gwr_bsb_vkb_loc_str',
            format: 'image/png',
            transparent: true,
			tiled: true,
            crs: RDcrs,
			version: '1.3.0',
        //    crs: L.CRS.EPSG28992,
		//	tilesorigin: [-180, 90],
            attribution: "RTD Straatnaamborden"
        });

		RTD_Plantsoenen_Layer = L.tileLayer.wms(siteProtocol+sitePrefixExtern+"ows.gis.rotterdam.nl/cgi-bin/mapserv.exe?map=d:\\gwr\\webdata\\mapserver\\map\\BBDWH_pub.map", {
            layers: 'sdo_gwr_bsb_grn_elm_vlk',
            format: 'image/png',
            transparent: true,
			tiled: true,
            crs: RDcrs,
			version: '1.3.0',
        //    crs: L.CRS.EPSG28992,
		//	tilesorigin: [-180, 90],
            attribution: "RTD Plantsoenen"
        });

		RTD_Lichtmasten_Layer = L.tileLayer.wms(siteProtocol+sitePrefixExtern+"ows.gis.rotterdam.nl/cgi-bin/mapserv.exe?map=d:\\gwr\\webdata\\mapserver\\map\\BBDWH_pub.map", {
            layers: 'sdo_gwr_bsb_ovl',
            format: 'image/png',
            transparent: true,
			tiled: true,
            crs: RDcrs,
			version: '1.3.0',
        //    crs: L.CRS.EPSG28992,
		//	tilesorigin: [-180, 90],
            attribution: "RTD Lichtmasten"
        });


		ARH_Bossen_Layer = L.tileLayer.wms(siteProtocol+sitePrefixExtern+"geo1.arnhem.nl/arcgis/services/Openbaar/Groen_in_Arnhem/MapServer/WmsServer", {
            layers: '1',
            format: 'image/png',
            transparent: true,
			tiled: true,
            crs: RDcrs,
			version: '1.3.0',
        //    crs: L.CRS.EPSG28992,
		//	tilesorigin: [-180, 90],
            attribution: "ARH Bossen"
        });

		ARH_Tuinen_Layer = L.tileLayer.wms(siteProtocol+sitePrefixExtern+"geo1.arnhem.nl/arcgis/services/Openbaar/Groen_in_Arnhem/MapServer/WmsServer", {
            layers: '2',
            format: 'image/png',
            transparent: true,
			tiled: true,
            crs: RDcrs,
			version: '1.3.0',
        //    crs: L.CRS.EPSG28992,
		//	tilesorigin: [-180, 90],
            attribution: "ARH Tuinen"
        });

		ARH_Parken_Layer = L.tileLayer.wms(siteProtocol+sitePrefixExtern+"geo1.arnhem.nl/arcgis/services/Openbaar/Groen_in_Arnhem/MapServer/WmsServer", {
            layers: '3',
            format: 'image/png',
            transparent: true,
			tiled: true,
            crs: RDcrs,
			version: '1.3.0',
        //    crs: L.CRS.EPSG28992,
		//	tilesorigin: [-180, 90],
            attribution: "ARH Parken"
        });

		ARH_BomenWVControle_Layer = L.tileLayer.wms(siteProtocol+sitePrefixExtern+"geo1.arnhem.nl/arcgis/services/Openbaar/Waardevolle_bomen/MapServer/WmsServer", {
            layers: '0',
            format: 'image/png',
            transparent: true,
			tiled: true,
            crs: RDcrs,
			version: '1.3.0',
        //    crs: L.CRS.EPSG28992,
		//	tilesorigin: [-180, 90],
            attribution: "ARH Waardevolle bomen controle"
        });

		ARH_BomenWVBeschermd_Layer = L.tileLayer.wms(siteProtocol+sitePrefixExtern+"geo1.arnhem.nl/arcgis/services/Openbaar/Waardevolle_bomen/MapServer/WmsServer", {
            layers: '1',
            format: 'image/png',
            transparent: true,
			tiled: true,
            crs: RDcrs,
			version: '1.3.0',
        //    crs: L.CRS.EPSG28992,
		//	tilesorigin: [-180, 90],
            attribution: "ARH Waardevolle bomen beschermd"
        });

		ARH_BomenWV_Layer = L.tileLayer.wms(siteProtocol+sitePrefixExtern+"geo1.arnhem.nl/arcgis/services/Openbaar/Waardevolle_bomen/MapServer/WmsServer", {
            layers: '2',
            format: 'image/png',
            transparent: true,
			tiled: true,
            crs: RDcrs,
			version: '1.3.0',
        //    crs: L.CRS.EPSG28992,
		//	tilesorigin: [-180, 90],
            attribution: "ARH Waardevolle bomen"
        });

		ARH_Restgroen_Layer = L.tileLayer.wms(siteProtocol+sitePrefixExtern+"geo1.arnhem.nl/arcgis/services/Openbaar/Snippergroen/MapServer/WmsServer", {
            layers: '0',
            format: 'image/png',
            transparent: true,
			tiled: true,
            crs: RDcrs,
			version: '1.3.0',
        //    crs: L.CRS.EPSG28992,
		//	tilesorigin: [-180, 90],
            attribution: "ARH Restgroen"
        });

		ARH_KlimaatZones_Layer = L.tileLayer.wms(siteProtocol+sitePrefixExtern+"geo1.arnhem.nl/arcgis/services/Openbaar/Hittekaart/MapServer/WmsServer", {
            layers: '0',
            format: 'image/png',
            transparent: true,
			tiled: true,
            crs: RDcrs,
			version: '1.3.0',
        //    crs: L.CRS.EPSG28992,
		//	tilesorigin: [-180, 90],
            attribution: "ARH Klimaatzones"
        });

		ARH_KlimaatZonesL_Layer = L.tileLayer.wms(siteProtocol+sitePrefixExtern+"geo1.arnhem.nl/arcgis/services/Openbaar/Hittekaart/MapServer/WmsServer", {
            layers: '1',
            format: 'image/png',
            transparent: true,
			tiled: true,
            crs: RDcrs,
			version: '1.3.0',
        //    crs: L.CRS.EPSG28992,
		//	tilesorigin: [-180, 90],
            attribution: "ARH Klimaatzones lijn"
        });

		ARH_KlimaatZonesP_Layer = L.tileLayer.wms(siteProtocol+sitePrefixExtern+"geo1.arnhem.nl/arcgis/services/Openbaar/Hittekaart/MapServer/WmsServer", {
            layers: '2',
            format: 'image/png',
            transparent: true,
			tiled: true,
            crs: RDcrs,
			version: '1.3.0',
        //    crs: L.CRS.EPSG28992,
		//	tilesorigin: [-180, 90],
            attribution: "ARH Klimaatzones punt"
        });

		ARH_AfvalKunststof_Layer = L.tileLayer.wms(siteProtocol+sitePrefixExtern+"geo1.arnhem.nl/arcgis/services/Openbaar/Afval/MapServer/WmsServer", {
            layers: '0',
            format: 'image/png',
            transparent: true,
			tiled: true,
            crs: RDcrs,
			version: '1.3.0',
        //    crs: L.CRS.EPSG28992,
		//	tilesorigin: [-180, 90],
            attribution: "ARH Afval Kunststof"
        });

		ARH_AfvalGlas_Layer = L.tileLayer.wms(siteProtocol+sitePrefixExtern+"geo1.arnhem.nl/arcgis/services/Openbaar/Afval/MapServer/WmsServer", {
            layers: '1',
            format: 'image/png',
            transparent: true,
			tiled: true,
            crs: RDcrs,
			version: '1.3.0',
        //    crs: L.CRS.EPSG28992,
		//	tilesorigin: [-180, 90],
            attribution: "ARH Afval Glas"
        });

		ARH_AfvalRestafval_Layer = L.tileLayer.wms(siteProtocol+sitePrefixExtern+"geo1.arnhem.nl/arcgis/services/Openbaar/Afval/MapServer/WmsServer", {
            layers: '2',
            format: 'image/png',
            transparent: true,
			tiled: true,
            crs: RDcrs,
			version: '1.3.0',
        //    crs: L.CRS.EPSG28992,
		//	tilesorigin: [-180, 90],
            attribution: "ARH Afval Restafval"
        });

		ARH_AfvalPapier_Layer = L.tileLayer.wms(siteProtocol+sitePrefixExtern+"geo1.arnhem.nl/arcgis/services/Openbaar/Afval/MapServer/WmsServer", {
            layers: '3',
            format: 'image/png',
            transparent: true,
			tiled: true,
            crs: RDcrs,
			version: '1.3.0',
        //    crs: L.CRS.EPSG28992,
		//	tilesorigin: [-180, 90],
            attribution: "ARH Afval Papier"
        });

		ARH_AfvalTextiel_Layer = L.tileLayer.wms(siteProtocol+sitePrefixExtern+"geo1.arnhem.nl/arcgis/services/Openbaar/Afval/MapServer/WmsServer", {
            layers: '4',
            format: 'image/png',
            transparent: true,
			tiled: true,
            crs: RDcrs,
			version: '1.3.0',
        //    crs: L.CRS.EPSG28992,
		//	tilesorigin: [-180, 90],
            attribution: "ARH Afval Textiel"
        });




		KNMI_Layer = L.tileLayer.wms(siteProtocol+sitePrefixExtern+"data.knmi.nl/wms/cgi-bin/wms.cgi", {
            layers: 'ta',
            format: 'image/png',
            transparent: true,
			tiled: true,
			version: '1.3.0',
        //    crs: RDcrs,
        //    crs: L.CRS.EPSG28992,
            crs: L.CRS.EPSG4326,
		//	tilesorigin: [-180, 90],
            attribution: "KNMI"
        });

// https://data.knmi.nl/wms/cgi-bin/wms.cgi?%26source%3D%2FActuele10mindataKNMIstations%2F1%2Fnoversion%2F2015%2F05%2F23%2FKMDS__OPER_P___10M_OBS_L2%2Enc%26SERVICE=WMS&&SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&LAYERS=ta&WIDTH=1262&HEIGHT=454&CRS=EPSG%3A4326&BBOX=50.86031488,-1.328326646343621,55.44410512,11.413398646343621&STYLES=auto%2Fpointnearest&FORMAT=image/png&TRANSPARENT=TRUE&

// &time=2015-05-23T12%3A50%3A00Z



		//map.addLayer( new ApriLeafLetLayerBase().initLayer({latLng: L.latLng( 51.43881, 5.48046 )} )  );



		cbsBuurtInfoLayer = new L.geoJson(null, {
			  layerType:"cbsBuurtInfoLayer"
			, style: function (feature) {
				var color = "#0FF";
				if (feature.properties.p_00_14_jr>5) color = "#FF0";
				if (feature.properties.p_00_14_jr>15) color = "#F00";
        		return {color: '#000', fillColor:color, weight:1, opacity:0.8, fillOpacity:0.5 };
    			}
			, onEachFeature:onEachCbsBuurtInfoFeature
			, pointToLayer: function (feature, latlng) {
				return L.marker(latlng, { icon: trainIcon} );
				}
			, refreshData:true
			, loadDataOnce:
				function () {
//					ajaxGetData(APRI.getConfig().urlSystemRoot + "/data/aireas/getCbsBuurtInfo/*",
					ajaxGetData(siteAireas + "/data/aireas/getCbsBuurtInfo/*",
						function(data) {
							cbsBuurtInfoLayer.addData(JSON.parse(data));
						}
					)
            	}
		});

		// CBS buurt zonder AiREAS Info
        function onEachCbsBuurtInfoFeature (feature, layer) {
            // does this feature have a property named popupContent?
            if (feature.properties && feature.properties.bu_naam) {
                layer.bindPopup(feature.properties.bu_naam +
				'<BR/><DIV style="width:132px;">------------------------</DIV>' +
				'<BR/>' + 'Leeftijd  0-14jr: ' + feature.properties.p_00_14_jr + '%' +
				'<BR/>' + 'Leeftijd 15-24jr: ' + feature.properties.p_15_24_jr + '%' +
				'<BR/>' + 'Leeftijd 25-44jr: ' + feature.properties.p_25_44_jr + '%' +
				'<BR/>' + 'Leeftijd 45-64jr: ' + feature.properties.p_45_64_jr + '%' +
				'<BR/>' + 'Leeftijd 65-e.o.: ' + feature.properties.p_65_eo_jr + '%');
            }


			(function(layer, properties) {
				// Create a mouseover event
      			layer.on("mouseover", function (e) {
					this.openPopup();
					return;
        			// Change the style to the highlighted version
        	//		layer.setStyle(highlightStyle);
        			// Create a popup with a unique ID linked to this record
        			var popup = $("<div></div>", {
            			id: "popup-" + properties.gid,
            			css: {
                			position: "absolute",
                			bottom: "85px",
                			left: "50px",
                			zIndex: 1002,
                			backgroundColor: "white",
                			padding: "8px",
                			border: "1px solid #ccc"
            			}
        			});
        			// Insert a headline into that popup
        			var hed = $("<div></div>", {
            			text: properties.location + " / " + properties.datum + " / Kracht: " + properties.mag + " / Diepte: " + properties.depth,
            			css: {fontSize: "16px", marginBottom: "3px"}
        			}).appendTo(popup);
        			// Add the popup to the map
        			//popup.appendTo("#map");
//        			popup.appendTo("#"+this.apriFormContainerId + '-leafletjs-container');
        			popup.appendTo("#"+map._container.id);
				});
      			// Create a mouseout event that undoes the mouseover changes
      			layer.on("mouseout", function (e) {
					this.openPopup();
					return;
        			// Start by reverting the style back
        	//		layer.setStyle(defaultStyle);
        			// And then destroying the popup
        			$("#popup-" + properties.gid).remove();
      			});
      			// Close the "anonymous" wrapper function, and call it while passing
      			// in the variables necessary to make the events work the way we want.
			})(layer, feature.properties);
        }




		cbsBuurtRookRisicoInfoLayer = new L.geoJson(null, {
			  layerType:"cbsBuurtRookRisicoInfoLayer"
			, style: function (feature) {
				var _color = "#000000";
				//var _fillOpacity = 0.1;
				var _fillOpacity = 0.0;
				if (feature.properties.aantal_markers>0) 	{
					_color = "#FF0000";
					_fillOpacity = 0.4;
				};
				if (feature.properties.aantal_markers>5) 	{
					_color = "#FF0000";
					_fillOpacity = 0.6;
				};
				if (feature.properties.aantal_markers>10) 	{
					_color = "#FF0000";
					_fillOpacity = 0.8;
				};
        		return {color: '#555555', opacity:1, fillColor:_color, weight:1, fillOpacity:_fillOpacity };
    			}
			, onEachFeature:onEachCbsBuurtRookRisicoInfoFeature
			, refreshData:true
			, loadDataOnce:
				function () {
					var mapCenter = map.getCenter();
//					ajaxGetData(APRI.getConfig().urlSystemRoot + "/data/aireas/getCbsBuurtInfo/*",
					ajaxGetData(siteAireas + "/data/aireas/getCbsBuurtRookRisicoInfo/*", //?lat=" + mapCenter.lat + "&lng=" + mapCenter.lng,
						function(data) {
							cbsBuurtRookRisicoInfoLayer.addData(JSON.parse(data));
						}
					)
            	}
		});

		// CBS buurt met RookRisico waarde property
        function onEachCbsBuurtRookRisicoInfoFeature (feature, layer) {
            // does this feature have a property named popupContent?
/*
            if (feature.properties && feature.properties.bu_naam) {
                layer.bindPopup(feature.properties.bu_naam +
				'<BR/><DIV style="width:132px;">------------------------</DIV>' +
				'<BR/>' + 'Leeftijd  0-14jr: ' + feature.properties.p_00_14_jr + '%' +
				'<BR/>' + 'Leeftijd 15-24jr: ' + feature.properties.p_15_24_jr + '%' +
				'<BR/>' + 'Leeftijd 25-44jr: ' + feature.properties.p_25_44_jr + '%' +
				'<BR/>' + 'Leeftijd 45-64jr: ' + feature.properties.p_45_64_jr + '%' +
				'<BR/>' + 'Leeftijd 65-e.o.: ' + feature.properties.p_65_eo_jr + '%');
            }
*/

			(function(layer, properties) {
				// Create a mouseclick event
      			layer.on("click", function (e) {
					//alert("Lat, Lon : " + e.latlng.lat + ", " + e.latlng.lng);
					var rookRisicoMarker = L.circleMarker([e.latlng.lat, e.latlng.lng] ,{title: 'unselected', dateCreated: new Date() }).addTo(map);
					ajaxGetData(siteAireas + "/data/aireas/setBuurtRookRisicoMarker/*?lat=" + e.latlng.lat + "&lng=" + e.latlng.lng,
						function(data) {
							var result = JSON.parse(data);
							if (result.markerOk) {
								rookRisicoMarker.setStyle({color: 'green', fillColor:'green'});
							} else {
								rookRisicoMarker.setStyle({color: 'yellow', fillColor:'red'});
							}
						}
					);
				});
				// Create a mouseover event
      			layer.on("mouseover", function (e) {
					layer.setStyle({fillColor: 'grey'});
				});
      			// Create a mouseout event that undoes the mouseover changes
      			layer.on("mouseout", function (e) {
        			// Start by reverting the style back
        			layer.setStyle(e.layer.options.style(e.target.feature) ); // layer.setStyle(defaultStyle);
      			});
      			// Close the "anonymous" wrapper function, and call it while passing
      			// in the variables necessary to make the events work the way we want.
			})(layer, feature.properties);
        }


		cbsBuurtProjectEhvAirportLayer = new L.geoJson(null, {
			  layerType:"cbsBuurtProjectEhvAirportLayer"
			, style: function (feature) {
				var _color = "#000000";
				//var _fillOpacity = 0.1;
				var _fillOpacity = 0.5;
				if (feature.properties.bu_naam== 'Verspreide huizen Riethoven') 	{
					_color = "#FF0000";
					_fillOpacity = 0.4;
				};
				if (feature.properties.bu_naam== 'Walik en De Hobbel') 	{
					_color = "#FF00FF";
					_fillOpacity = 0.4;
				};
				if (feature.properties.bu_naam== 'Verspreide huizen Mierlo') 	{
					_color = "#FF0000";
					_fillOpacity = 0.4;
				};
				if (feature.properties.bu_naam== 'Mierlo') 	{
					_color = "#FF00FF";
					_fillOpacity = 0.4;
				};
				if (feature.properties.bu_naam== 'Buitengebied') 	{
					_color = "#FF00FF";
					_fillOpacity = 0.4;
				};
				if (feature.properties.bu_naam== 'Verspreide huizen Gerwen') 	{
					_color = "#FF00FF";
					_fillOpacity = 0.4;
				};
				if (feature.properties.bu_naam== 'Verspreide huizen ten zuidoosten van Nuenen') 	{
					_color = "#FF00FF";
					_fillOpacity = 0.4;
				};


        		return {color: '#000000', opacity:1, fillColor:_color, weight:2, fillOpacity:_fillOpacity };
    			}
			, onEachFeature:onEachCbsBuurtProjectEhvAirportFeature
			, refreshData:true
			, loadDataOnce:
				function () {
					var mapCenter = map.getCenter();
//					ajaxGetData(APRI.getConfig().urlSystemRoot + "/data/aireas/getCbsBuurtInfo/*",
					var _url= "http://openiod.com/SCAPE604/openiod?SERVICE=WPS&REQUEST=Execute&identifier=transform_observation&inputformat=projectEhvAirport&objectid=areas&format=xml"

					ajaxGetData(_url, //?lat=" + mapCenter.lat + "&lng=" + mapCenter.lng,
//					ajaxGetData(siteAireas + "/data/aireas/getCbsBuurtRookRisicoInfo/*", //?lat=" + mapCenter.lat + "&lng=" + mapCenter.lng,

						function(data) {
							cbsBuurtProjectEhvAirportLayer.addData(JSON.parse(data));
						}
					)
            	}
		});

		// CBS buurt met RookRisico waarde property
        function onEachCbsBuurtProjectEhvAirportFeature (feature, layer) {
            // does this feature have a property named popupContent?

            if (feature.properties && feature.properties.bu_naam) {
                layer.bindPopup(feature.properties.bu_naam +
				'<BR/><DIV style="width:132px;">------------------------</DIV>' +
				'<BR/>' + 'Gemeente: ' + feature.properties.gm_naam +
				'<BR/>' + 'Buurt: ' + feature.properties.bu_naam );
            }


			(function(layer, properties) {
				// Create a mouseclick event
/*
      			layer.on("click", function (e) {
					//alert("Lat, Lon : " + e.latlng.lat + ", " + e.latlng.lng);
					var rookRisicoMarker = L.circleMarker([e.latlng.lat, e.latlng.lng] ,{title: 'unselected', dateCreated: new Date() }).addTo(map);
					ajaxGetData(siteAireas + "/data/aireas/setBuurtRookRisicoMarker/*?lat=" + e.latlng.lat + "&lng=" + e.latlng.lng,
						function(data) {
							var result = JSON.parse(data);
							if (result.markerOk) {
								rookRisicoMarker.setStyle({color: 'green', fillColor:'green'});
							} else {
								rookRisicoMarker.setStyle({color: 'yellow', fillColor:'red'});
							}
						}
					);
				});
*/
				// Create a mouseover event
      			layer.on("mouseover", function (e) {
					layer.setStyle({fillColor: 'grey'});
				});
      			// Create a mouseout event that undoes the mouseover changes
      			layer.on("mouseout", function (e) {
        			// Start by reverting the style back
        			layer.setStyle(e.layer.options.style(e.target.feature) ); // layer.setStyle(defaultStyle);
      			});
      			// Close the "anonymous" wrapper function, and call it while passing
      			// in the variables necessary to make the events work the way we want.
			})(layer, feature.properties);
        }




// todo remove jquery dependency, test etc.
		aardbevingenLocationsLayer = new L.geoJson(null,{layerType:"aardbevingenLocationsLayer"
			, onEachFeature:onEachAardbevingenLocationFeature
			, pointToLayer: function (feature, latlng) {
				return L.marker(latlng, { } );
				}
			, refreshData:true
			, loadDataOnce:
				function () {
        			// GBB aardbevingen data
					ajaxGetData(APRI.getConfig().urlSystemRoot + "/gbb/aardbevingen/",
						function(data) {
							aardbevingenLocationsLayer.addData(JSON.parse(data));
						}
					)
            	}
		});
        function onEachAardbevingenLocationFeature (feature, layer) {
            // does this feature have a property named popupContent?
            if (feature.properties && feature.properties.location) {
                layer.bindPopup(feature.properties.location + '<BR/>Diepte: ' + feature.properties.depth  + '<BR/>Kracht: ' + feature.properties.mag + '<BR/>' +
						'Datum: ' + feature.properties.datum );
            }

			(function(layer, properties) {
				// Create a mouseover event
      			layer.on("mouseover", function (e) {
        			// Change the style to the highlighted version
        	//		layer.setStyle(highlightStyle);
        			// Create a popup with a unique ID linked to this record
        			var popup = $("<div></div>", {
            			id: "popup-" + properties.gid,
            			css: {
                			position: "absolute",
                			bottom: "85px",
                			left: "50px",
                			zIndex: 1002,
                			backgroundColor: "white",
                			padding: "8px",
                			border: "1px solid #ccc"
            			}
        			});
        			// Insert a headline into that popup
        			var hed = $("<div></div>", {
            			text: properties.location + " / " + properties.datum + " / Kracht: " + properties.mag + " / Diepte: " + properties.depth,
            			css: {fontSize: "16px", marginBottom: "3px"}
        			}).appendTo(popup);
        			// Add the popup to the map
        			//popup.appendTo("#map");
//        			popup.appendTo("#"+this.apriFormContainerId + '-leafletjs-container');
        			popup.appendTo("#"+map._container.id);
				});
      			// Create a mouseout event that undoes the mouseover changes
      			layer.on("mouseout", function (e) {
        			// Start by reverting the style back
        	//		layer.setStyle(defaultStyle);
        			// And then destroying the popup
        			$("#popup-" + properties.gid).remove();
      			});
      			// Close the "anonymous" wrapper function, and call it while passing
      			// in the variables necessary to make the events work the way we want.
			})(layer, feature.properties);
        }



		var dataRetrievedFlow = false;
		var dataRetrievedSpeed = false;

/*
		var loadDataTrafficOnce = function(typeOfProduct) {
			if (typeOfProduct == "FLOW" && !dataRetrievedFlow) {
				flowTrafficHeatMap(typeOfProduct);
				dataRetrievedFlow = true;
			}
			if (typeOfProduct == "SPEED" && !dataRetrievedSpeed) {
				speedTrafficHeatMap(typeOfProduct);
				dataRetrievedSpeed = true;
			}
		}
*/


//		var trafficFlowDataRecords=[];
//		heatmapTrafficFlowLayer = L.heatLayer(trafficFlowDataRecords, {radius: 15, blur:10, max:1, gradient: {0.4: 'blue', 0.6: 'cyan', 0.7: 'lime', 0.8: 'yellow', 1: 'red'}, loadTrafficData: "FLOW", layerType:'heatmapTrafficFlowLayer', refreshData: true, loadDataTrafficFlowLayer:loadDataTrafficFlowLayer }); //, max:10, gradient: {0.4: 'blue', 0.65: 'lime', 1: 'red'}



//		var trafficSpeedDataRecords=[];
//		heatmapTrafficSpeedLayer = L.heatLayer(trafficSpeedDataRecords, {radius: 15, blur:10, max:1, gradient: {0.4: 'blue', 0.6: 'cyan', 0.7: 'lime', 0.8: 'yellow', 1: 'red'}, loadTrafficData: "SPEED", loadDataTrafficOnce: loadDataTrafficOnce}); //, max:10, gradient: {0.4: 'blue', 0.65: 'lime', 1: 'red'}


/*
		function loadDataTrafficFlowLayer(layer, options) {

			options.trafficFlowUrl 	= "https://openiod.org/SCAPE604/openiod?SERVICE=WPS&REQUEST=Execute&identifier=NDW_trafficSpeed&location="+currentAreaCode+"&valueType=traffic&format=json";
			//var _tmpDate1 = new Date(retrieveddatemax);

			for (var i=0; i<options.properties.retrievedDateCacheTrafficFlow.length;i++) {
				var diff = options.properties.retrievedDateCacheTrafficFlow[i].retrievedDateDate.getTime() - new Date(options.properties.retrievedDateMax).getTime();
				if (diff > -480000 && diff < 480000) {  //less than 9min = hit
					options.properties.retrievedDateMax = options.properties.retrievedDateCacheTrafficFlow[i].retrievedDate;
					//console.log('retrieveddate (cache/hit): ' + retrievedDateMax + ' '+options.retrievedDateMax);
					window.setTimeout(function(){
						heatmapTrafficFlowLayer.setLatLngs(options.properties.retrievedDateCacheTrafficFlow[i].trafficFlowDataRecords);

						//layer.clearLayers();
						//layer.addData(retrievedDateCacheTrafficFlow[i].data);
						//layer.layerControl[0].setActiveDateTime(retrievedDateMax, '(cache)');  //timeSliderCtrl
						//if (options.next) {
						//	var _newDate = new Date(new Date(retrievedDateMax).getTime()+ 600000);  // +10 minutes for next measure, no need for extra marge here
						//	//console.log('retrieveddate next : ' + _newDate.toISOString());
						//	playSliderMovie(layer, _newDate, options.avgType);
						//}
					}, 200);
					return;
				}
			}

			var retrievedDatePlusMargeIso = new Date(new Date(options.retrievedDateMax).getTime()+60000).toISOString();

			var _trafficFlowUrl = options.trafficFlowUrl + "&maxRetrievedDate="+retrievedDatePlusMargeIso;

			ajaxGetData( _trafficFlowUrl,
				function(data) {
					var _data = JSON.parse(data);
					if (_data.length == 0 ) return;


					var _retrievedDate = _data[0].properties.site.retrievedDate;

					var _retrievedDateCacheRecord={};
					_retrievedDateCacheRecord.data = _data;
					_retrievedDateCacheRecord.retrievedDate = _retrievedDate;
					_retrievedDateCacheRecord.retrievedDateDate = new Date(_retrievedDate);

//					retrievedDateMax = _retrievedDate; //_retrievedDate?_retrievedDate:options.retrievedDateMax;

					// set data array for heatmap layer
					trafficFlowDataRecords= [];
					for (var i=0;i<_data.length;i++) {
						var _record = _data[i];
						//var _retrievedDateTime = new Date(_record.properties.site.retrievedDate).getTime();
						//var _diff = _retrievedDateTime - retrievedDateMaxTrafficFlow.getTime();
						//if (_diff> 90000 || _diff< -90000 ) continue;

							if (_data[i].properties.site.id == 'GEO01_SRETI002' ) continue; // strange (high) values for traffic flow
								var inpRecord = _data[i];
								if (inpRecord.properties.trafficFlow == undefined ) continue; // No measurements for this site
								var _trafficFlowDataRecord = [];
								_trafficFlowDataRecord[0] = inpRecord.geometry.coordinates[1];
								_trafficFlowDataRecord[1] = inpRecord.geometry.coordinates[0];
								//_verbruikDataRecordGAS.alt = inpRecordGas.SJV*0.001;
								_trafficFlowDataRecord.alt = inpRecord.properties.trafficFlow.total/200;
								// inpRecordGas.aantalAanslDef
								trafficFlowDataRecords.push(_trafficFlowDataRecord);
							}
					heatmapTrafficFlowLayer.setLatLngs(trafficFlowDataRecords);
					_retrievedDateCacheRecord.trafficFlowDataRecords = trafficFlowDataRecords;
					retrievedDateCacheTrafficFlow.push(_retrievedDateCacheRecord);  // store in cache


					//layer.clearLayers();
					//layer.addData(_data);

					//layer.layerControl[0].setActiveDateTime(_retrievedDateCacheRecord.retrievedDateDate, '(db)'); //timeSliderCtrl

			//		if (options.next) {
			//			var _newDate = new Date(new Date(options.retrievedDateMax).getTime()+ 600000);  // +10 minutes for next measure, no need for extra marge here
			//			//console.log('retrieveddate next : ' + _newDate.toISOString());
			//			window.setTimeout(function(){
			//				playSliderMovieTrafficFlow(layer, _newDate, options.avgType);
			//			}, 200);
			//		}
				}
			)
		}
*/
/*
		var flowTrafficHeatMap = function(typeOfProduct) {
			var options = {};
			options.typeOfProduct 	= typeOfProduct;
			options.trafficFlowUrl 	= "http://openiod.com/SCAPE604/openiod?SERVICE=WPS&REQUEST=Execute&identifier=NDW_trafficSpeed&location="+currentAreaCode+"&valueType=traffic&format=json";

			loadDataTrafficFlowLayer(layer, options);

			function ajaxCallHeatMap (productSoort) {

				var xmlhttpHeatmap;
				xmlhttpHeatmap=new XMLHttpRequest();

				// var trafficFlowUrl = APRI.getConfig().urlSystemRoot + "/liander/verbruik/" + productSoort + "/";
//				var trafficFlowUrl = "http://openiod.com/SCAPE604/openiod?SERVICE=WPS&REQUEST=Execute&identifier=NDW_trafficSpeed&location=EHV&valueType=traffic&format=json";  //&valueType=traffic||&valueType=trafficFlow||&valueType=trafficSpeed
				var maxRetrievedDate=new Date().toISOString(); // '2015-08-11T15:01:00Z';
				var trafficFlowUrl = "http://openiod.com/SCAPE604/openiod?SERVICE=WPS&REQUEST=Execute&identifier=NDW_trafficSpeed&location="+currentAreaCode+"&valueType=traffic&format=json";  //&valueType=traffic||&valueType=trafficFlow||&valueType=trafficSpeed
				xmlhttpHeatmap.onreadystatechange=function() {

  					if (xmlhttpHeatmap.readyState==4 && xmlhttpHeatmap.status==200) {
			    		var _data = JSON.parse(xmlhttpHeatmap.responseText);
						if (productSoort == "FLOW" ) {


							retrievedDateCacheTrafficFlow = _data.sort(function(a,b) {
								var _aRetrievedDate = new Date(a.properties.site.retrievedDate).getTime();
								var _bRetrievedDate = new Date(b.properties.site.retrievedDate).getTime();

								if (_aRetrievedDate < _bRetrievedDate) return -1;
								if (_aRetrievedDate > _bRetrievedDate) return 1;
								return 0;
							})

							retrievedDateMaxTrafficFlow = new Date(retrievedDateCacheTrafficFlow[retrievedDateCacheTrafficFlow.length-1].properties.site.retrievedDate);

							// set data array for heatmap layer
							trafficFlowDataRecords= [];
							for (var i=0;i<retrievedDateCacheTrafficFlow.length;i++) {
								var _record = retrievedDateCacheTrafficFlow[i];
								var _retrievedDateTime = new Date(_record.properties.site.retrievedDate).getTime();
								var _diff = _retrievedDateTime - retrievedDateMaxTrafficFlow.getTime();
								if (_diff> 90000 || _diff< -90000 ) continue;

								if (_data[i].properties.site.id == 'GEO01_SRETI002' ) continue; // strange (high) values for traffic flow
								var inpRecord = _data[i];
								if (inpRecord.properties.trafficFlow == undefined ) continue; // No measurements for this site
								var _trafficFlowDataRecord = [];
								_trafficFlowDataRecord[0] = inpRecord.geometry.coordinates[1];
								_trafficFlowDataRecord[1] = inpRecord.geometry.coordinates[0];
								//_verbruikDataRecordGAS.alt = inpRecordGas.SJV*0.001;
								_trafficFlowDataRecord.alt = inpRecord.properties.trafficFlow.total/200;
								// inpRecordGas.aantalAanslDef
								trafficFlowDataRecords.push(_trafficFlowDataRecord);
							}
							heatmapTrafficFlowLayer.setLatLngs(trafficFlowDataRecords);

						}
					} // end of if (xmlhttpHeatmap.readyState==4 && xmlht
  				} // end of xmlhttpHeatmap.onreadystatechange

				xmlhttpHeatmap.open("GET",trafficFlowUrl,true);
				xmlhttpHeatmap.send();

			}
		}
*/
//oude versie:
/*
		var flowTrafficHeatMap = function(typeOfProduct) {

			ajaxCallHeatMap(typeOfProduct);

			function ajaxCallHeatMap (productSoort) {

				var xmlhttpHeatmap;
				xmlhttpHeatmap=new XMLHttpRequest();

				// var trafficFlowUrl = APRI.getConfig().urlSystemRoot + "/liander/verbruik/" + productSoort + "/";
//				var trafficFlowUrl = "http://openiod.com/SCAPE604/openiod?SERVICE=WPS&REQUEST=Execute&identifier=NDW_trafficSpeed&location=EHV&valueType=traffic&format=json";  //&valueType=traffic||&valueType=trafficFlow||&valueType=trafficSpeed
				var maxRetrievedDate=new Date().toISOString(); // '2015-08-11T15:01:00Z';
				var trafficFlowUrl = "http://openiod.com/SCAPE604/openiod?SERVICE=WPS&REQUEST=Execute&identifier=NDW_trafficSpeed&location="+currentAreaCode+"&valueType=traffic&format=json";  //&valueType=traffic||&valueType=trafficFlow||&valueType=trafficSpeed
				xmlhttpHeatmap.onreadystatechange=function() {

  					if (xmlhttpHeatmap.readyState==4 && xmlhttpHeatmap.status==200) {
			    		var _data = JSON.parse(xmlhttpHeatmap.responseText);
						if (productSoort == "FLOW" ) {


							retrievedDateCacheTrafficFlow = _data.sort(function(a,b) {
								var _aRetrievedDate = new Date(a.properties.site.retrievedDate).getTime();
								var _bRetrievedDate = new Date(b.properties.site.retrievedDate).getTime();

								if (_aRetrievedDate < _bRetrievedDate) return -1;
								if (_aRetrievedDate > _bRetrievedDate) return 1;
								return 0;
							})

							retrievedDateMaxTrafficFlow = new Date(retrievedDateCacheTrafficFlow[retrievedDateCacheTrafficFlow.length-1].properties.site.retrievedDate);

							// set data array for heatmap layer
							trafficFlowDataRecords= [];
							for (var i=0;i<retrievedDateCacheTrafficFlow.length;i++) {
								var _record = retrievedDateCacheTrafficFlow[i];
								var _retrievedDateTime = new Date(_record.properties.site.retrievedDate).getTime();
								var _diff = _retrievedDateTime - retrievedDateMaxTrafficFlow.getTime();
								if (_diff> 90000 || _diff< -90000 ) continue;

								if (_data[i].properties.site.id == 'GEO01_SRETI002' ) continue; // strange (high) values for traffic flow
								var inpRecord = _data[i];
								if (inpRecord.properties.trafficFlow == undefined ) continue; // No measurements for this site
								var _trafficFlowDataRecord = [];
								_trafficFlowDataRecord[0] = inpRecord.geometry.coordinates[1];
								_trafficFlowDataRecord[1] = inpRecord.geometry.coordinates[0];
								//_verbruikDataRecordGAS.alt = inpRecordGas.SJV*0.001;
								_trafficFlowDataRecord.alt = inpRecord.properties.trafficFlow.total/200;
								// inpRecordGas.aantalAanslDef
								trafficFlowDataRecords.push(_trafficFlowDataRecord);
							}
							heatmapTrafficFlowLayer.setLatLngs(trafficFlowDataRecords);

						}
					} // end of if (xmlhttpHeatmap.readyState==4 && xmlht
  				} // end of xmlhttpHeatmap.onreadystatechange

				xmlhttpHeatmap.open("GET",trafficFlowUrl,true);
				xmlhttpHeatmap.send();

			}
		}
*/




/*
		var speedTrafficHeatMap = function(typeOfProduct) {

			ajaxCallHeatMap(typeOfProduct);

			function ajaxCallHeatMap (productSoort) {

				var xmlhttpHeatmap;
				xmlhttpHeatmap=new XMLHttpRequest();

//				var trafficSpeedUrl = "http://openiod.com/SCAPE604/openiod?SERVICE=WPS&REQUEST=Execute&identifier=NDW_trafficSpeed&location=EHV&valueType=traffic&format=json";  //&valueType=traffic||&valueType=trafficFlow||&valueType=trafficSpeed
				var maxRetrievedDate='2015-08-11T15:01:00Z';
				var trafficSpeedUrl = "http://openiod.com/SCAPE604/openiod?SERVICE=WPS&REQUEST=Execute&identifier=NDW_trafficSpeed&location="+currentAreaCode+"&valueType=traffic&maxRetrievedDate="+maxRetrievedDate+"&format=json";  //&valueType=traffic||&valueType=trafficFlow||&valueType=trafficSpeed
				xmlhttpHeatmap.onreadystatechange=function() {

  					if (xmlhttpHeatmap.readyState==4 && xmlhttpHeatmap.status==200) {
			    		var _data = JSON.parse(xmlhttpHeatmap.responseText);
						if (productSoort == "SPEED" ) {
							// set data array for heatmap layer
							trafficSpeedDataRecords= [];
							for(var i=0;i<_data.length;i++) {
								//if (_data[i].properties.site.id == 'GEO01_SRETI002' ) continue; // strange (high) values for traffic flow
								var inpRecord = _data[i];
								if (inpRecord.properties.trafficSpeed == undefined ) continue; // No measurements for this site
								var _trafficSpeedDataRecord = [];
								_trafficSpeedDataRecord[0] = inpRecord.geometry.coordinates[1];
								_trafficSpeedDataRecord[1] = inpRecord.geometry.coordinates[0];
								_trafficSpeedDataRecord.alt = inpRecord.properties.trafficSpeed.high/10;
								trafficSpeedDataRecords.push(_trafficSpeedDataRecord);
							}
							heatmapTrafficSpeedLayer.setLatLngs(trafficSpeedDataRecords);

						}
					} // end of if (xmlhttpHeatmap.readyState==4 && xmlht
  				} // end of xmlhttpHeatmap.onreadystatechange

				xmlhttpHeatmap.open("GET",trafficSpeedUrl,true);
				xmlhttpHeatmap.send();

			}
		}
*/

		ndwTrafficFlowLayer = new L.geoJson(null, {
			  layerType:"ndwTrafficFlowLayer"
			, style: function (feature) {
				var _color; // = "#0000ff";
				var _fillOpacity=1;
//				if (feature.properties.trafficFlow == undefined) {
//					_fillOpacity = 0;
//				} else {
//					_fillOpacity = feature.properties.trafficFlow.total/2000;
//				}

				if (feature.properties.trafficFlow == undefined) {
					//_fillOpacity 	= 0;
					//_opacity		= 0;
					_color			= 'white';
				} else {
					var h = feature.properties.trafficFlow.total;
					switch (true) {
						case  (h <= 50):
							_color = "black";
							break;
						case  (h <= 200):
							_color = "green";
							break;
						case  (h <= 1000):
							_color = "yellow";
							break;
						case  (h <= 2000):
							_color = "orange";
							break;
						case  (h <= 3000):
							_color = "red";
							break;
						default:
							_color = "purple";
							break;
					}
				}

        		return {color: '#000', fillColor:_color, weight:1, opacity:0.7, fillOpacity:_fillOpacity };
    			}
			, onEachFeature:onEachNdwTrafficFlowLayerFeature
			, pointToLayer: function (feature, latlng) {

				return L.circleMarker(latlng, {
					radius: 4,
					fillColor: "#ff7800",
					color: "#000",
					weight: 1,
					opacity: 0.7,
					fillOpacity: 1
				});
			}
			, filter: function(feature, layer) {
				if (feature.properties.trafficFlow == undefined ) return false;
				return true;
				}
			, refreshData:true
			, loadDataOnce:
				function () {
					var mapCenter = map.getCenter();
//					ajaxGetData(APRI.getConfig().urlSystemRoot + "/data/aireas/getCbsBuurtInfo/*",

					// oud: http://localhost:4000/SCAPE604/openiod?SERVICE=SOS&REQUEST=GetTrafficSpeed&location=EHV&format=json
					// http://localhost:4000/SCAPE604/openiod?SERVICE=WPS&REQUEST=Execute&identifier=NDW_trafficSpeed&location=EHV&format=json

//					ajaxGetData("http://openiod.com/SCAPE604/openiod?SERVICE=WPS&REQUEST=Execute&identifier=NDW_trafficSpeed&location=EHV&valueType=traffic&format=json", //&valueType=traffic||&valueType=trafficFlow||&valueType=trafficSpeed
					//var maxRetrievedDate; //=undefined; //'2015-08-11T15:01:00Z';
//					ajaxGetData("http://openiod.com/SCAPE604/openiod?SERVICE=WPS&REQUEST=Execute&identifier=NDW_trafficSpeed&location="+currentAreaCode+"&valueType=traffic&maxRetrievedDate="+maxRetrievedDate+"&format=json", //&valueType=traffic||&valueType=trafficFlow||&valueType=trafficSpeed
					ajaxGetData("http://openiod.com/SCAPE604/openiod?SERVICE=WPS&REQUEST=Execute&identifier=NDW_trafficSpeed&location="+currentAreaCode+"&valueType=traffic&format=json", //&valueType=traffic||&valueType=trafficFlow||&valueType=trafficSpeed
						function(data) {
							var _data = JSON.parse(data);
							ndwTrafficFlowLayer.addData(_data);

						}
					)
            	}
		});



		// NDW traffic speed data
        function onEachNdwTrafficFlowLayerFeature (feature, layer) {
            // does this feature have a property named popupContent?
			var _time, _timeFormatted='';
			_time = new Date(feature.properties.site.measurementTimeDefault);
			_timeFormatted = moment(_time).format('YYYY/MM/DD HH:mm');
			var _content = '<DIV><DIV style="width:400px;">Traffic flowrate / speed ' + _timeFormatted + ' (' + feature.properties.site.id + ')</DIV>';

			var _measuredValues = feature.properties.site.measuredValues;
			var _mSC = feature.properties.site.measurementSpecificCharacteristics;

			if (_measuredValues) {
			for (var i=0;i<_measuredValues.length;i++) {

				_timeFormatted='';
				if (_measuredValues[i].time && _measuredValues[i].time != feature.properties.site.measurementTimeDefault ) {
					var _tmpTime = _measuredValues[i].time;
					_time = new Date(_tmpTime);
					_timeFormatted = moment(_time).format('HH:mm');
				}

				var _lane = _mSC[i].specificLane?_mSC[i].specificLane:'';
				var _period = _mSC[i].period=='60.0'?'uur':_mSC[i].period;

				var _vehicleLength = '';
				if (_mSC[i].specificVehicleCharacteristics) {
					var _svcTmp = _mSC[i].specificVehicleCharacteristics;
					for (var j=0; j<_svcTmp.length;j++) {
						if (_svcTmp[j].comparisonOperator) {
							switch (_svcTmp[j].comparisonOperator) {
								case 'lessThan' :
									_vehicleLength+='<';
									break;
								case 'lessThanOrEqualTo' :
									_vehicleLength+='<=';
									break;
								case 'greaterThanOrEqualTo' :
									_vehicleLength+='>=';
									break;
								case 'greaterThan' :
									_vehicleLength+='>';
									break;
								default:

							}
							_vehicleLength += _svcTmp[j].vehicleLength;

						} else {
							_vehicleLength+= _svcTmp[j].vehicleType;
						}
					}
				}
				if (_vehicleLength != '') {
					_vehicleLength = '(' + _vehicleLength + ')';
				}


				if (_measuredValues[i].vehicleFlowRate) {
					_content+= '<BR/>' + 'Vehicle ' + _vehicleLength + ' flow rate: ' + _measuredValues[i].vehicleFlowRate + ' /' + _period + ' ' + _lane + ' ' + _timeFormatted;
				} else if (_measuredValues[i].speed) {
					_content+= '<BR/>' + 'Speed ' + _vehicleLength + ': ' + _measuredValues[i].speed + 'km /' + _period + ' ' + _lane + ' ' + _timeFormatted;
				} else {
					_content+= '<BR/>' + 'index: ' + _measuredValues[i].index + ' ' + _lane + ' ' + _timeFormatted;
				}
			}
			} else {
				if (feature.properties.trafficFlow && feature.properties.trafficFlow.total) {
					_content+= '<BR/>' + 'Total vehicle flow rate: ' + feature.properties.trafficFlow.total + ' per uur';

				}
			}
			_content += '</DIV>';

			layer.bindPopup(_content);
/*
            if (feature.properties && feature.properties.bu_naam) {
                layer.bindPopup(feature.properties.bu_naam +
				'<BR/><DIV style="width:132px;">------------------------</DIV>' +
				'<BR/>' + 'Leeftijd  0-14jr: ' + feature.properties.p_00_14_jr + '%' +
				'<BR/>' + 'Leeftijd 15-24jr: ' + feature.properties.p_15_24_jr + '%' +
				'<BR/>' + 'Leeftijd 25-44jr: ' + feature.properties.p_25_44_jr + '%' +
				'<BR/>' + 'Leeftijd 45-64jr: ' + feature.properties.p_45_64_jr + '%' +
				'<BR/>' + 'Leeftijd 65-e.o.: ' + feature.properties.p_65_eo_jr + '%');
            }
*/

			(function(layer, properties) {
				// Create a mouseclick event
      			layer.on("click", function (e) {
					//alert("Lat, Lon : " + e.latlng.lat + ", " + e.latlng.lng);
/*					var rookRisicoMarker = L.circleMarker([e.latlng.lat, e.latlng.lng] ,{title: 'unselected', dateCreated: new Date() }).addTo(map);
					ajaxGetData(siteAireas + "/data/aireas/setBuurtRookRisicoMarker/*?lat=" + e.latlng.lat + "&lng=" + e.latlng.lng,
						function(data) {
							var result = JSON.parse(data);
							if (result.markerOk) {
								rookRisicoMarker.setStyle({color: 'green', fillColor:'green'});
							} else {
								rookRisicoMarker.setStyle({color: 'yellow', fillColor:'red'});
							}
						}
					);
*/				});
				// Create a mouseover event
      			layer.on("mouseover", function (e) {
					//layer.setStyle({fillColor: 'grey'});
				});
      			// Create a mouseout event that undoes the mouseover changes
      			layer.on("mouseout", function (e) {
        			// Start by reverting the style back
        			//layer.setStyle(e.layer.options.style(e.target.feature) ); // layer.setStyle(defaultStyle);
      			});
      			// Close the "anonymous" wrapper function, and call it while passing
      			// in the variables necessary to make the events work the way we want.
			})(layer, feature.properties);
        }



		ndwTrafficSpeedLayer = new L.geoJson(null, {
			  layerType:"ndwTrafficSpeedLayer"
			, style: function (feature) {
				var _color = "#0000ff";
				var _fillOpacity 	= 1;
				var _opacity 		= 0.8;

//				if ( feature.properties.site.id =='RWS01_MONICA_00D0320EA446D0050005' ) {
//					console.log('feature.properties.site.id %s %s', feature.properties.site.id, feature.properties.trafficSpeed.high);
//					console.log('feature.properties.site.id %s %s', feature.properties.site.id );
//				}


				if (feature.properties.trafficSpeed == undefined) {
					//_fillOpacity 	= 0;
					//_opacity		= 0;
					_color			= 'white';
				} else {
					var h = feature.properties.trafficSpeed.high;
					switch (true) {
						case  (h <= 30):
							_color = "black";
							break;
						case  (h <= 80):
							_color = "green";
							break;
						case  (h <= 100):
							_color = "yellow";
							break;
						case  (h <= 120):
							_color = "orange";
							break;
						case  (h <= 130):
							_color = "red";
							break;
						default:
							_color = "purple";
							break;
					}

					//_fillOpacity = (feature.properties.trafficSpeed.high / 170);
				}

        		return {color: '#000', fillColor:_color, weight:1, opacity:_opacity, fillOpacity:_fillOpacity };
    			}
			, onEachFeature:onEachNdwTrafficSpeedLayerFeature
			, filter: function(feature, layer) {
				if (feature.properties.trafficSpeed == undefined ) return false;
				return true;
				}
			, pointToLayer: function (feature, latlng) {
				var _radius=4;
				if (feature.properties.trafficSpeed == undefined) {
					_radius = 2;
				}

				return L.circleMarker(latlng, {
					radius: _radius,
					fillColor: "#ff7800",
					color: "#000",
					weight: 1,
					opacity: 1,
					fillOpacity: 0.8
				});
			}
			, refreshData:true
			, loadDataOnce:
				function () {
					var mapCenter = map.getCenter();
//					ajaxGetData(APRI.getConfig().urlSystemRoot + "/data/aireas/getCbsBuurtInfo/*",

					// oud: http://localhost:4000/SCAPE604/openiod?SERVICE=SOS&REQUEST=GetTrafficSpeed&location=EHV&format=json
					// http://localhost:4000/SCAPE604/openiod?SERVICE=WPS&REQUEST=Execute&identifier=NDW_trafficSpeed&location=EHV&format=json

//					ajaxGetData("http://openiod.com/SCAPE604/openiod?SERVICE=WPS&REQUEST=Execute&identifier=NDW_trafficSpeed&location=EHV&valueType=trafficSpeed&format=json", //&valueType=traffic||&valueType=trafficFlow||&valueType=trafficSpeed
					//var maxRetrievedDate; //='2015-08-11T15:01:00Z';
					//ajaxGetData("http://openiod.com/SCAPE604/openiod?SERVICE=WPS&REQUEST=Execute&identifier=NDW_trafficSpeed&location="+currentAreaCode+"&valueType=trafficSpeed&maxRetrievedDate="+maxRetrievedDate+"&format=json", //&valueType=traffic||&valueType=trafficFlow||&valueType=trafficSpeed
					ajaxGetData("http://openiod.com/SCAPE604/openiod?SERVICE=WPS&REQUEST=Execute&identifier=NDW_trafficSpeed&location="+currentAreaCode+"&valueType=trafficSpeed&format=json", //&valueType=traffic||&valueType=trafficFlow||&valueType=trafficSpeed
						function(data) {
							var _data = JSON.parse(data);
							ndwTrafficSpeedLayer.addData(_data);

						}
					)
            	}
		});

		// NDW traffic speed data
        function onEachNdwTrafficSpeedLayerFeature (feature, layer) {
            // does this feature have a property named popupContent?
			var _time, _timeFormatted='';
			_time = new Date(feature.properties.site.measurementTimeDefault);
			_timeFormatted = moment(_time).format('YYYY/MM/DD HH:mm');
			var _content = '<DIV><DIV style="width:400px;">Traffic flowrate / speed ' + _timeFormatted + ' (' + feature.properties.site.id + ')</DIV>';

			var _measuredValues = feature.properties.site.measuredValues;
			var _mSC = feature.properties.site.measurementSpecificCharacteristics;

			if (_measuredValues) {
			for (var i=0;i<_measuredValues.length;i++) {

				_timeFormatted='';
				if (_measuredValues[i].time && _measuredValues[i].time != feature.properties.site.measurementTimeDefault ) {
					var _tmpTime = _measuredValues[i].time;
					_time = new Date(_tmpTime);
					_timeFormatted = moment(_time).format('HH:mm');
				}

				var _lane = _mSC[i].specificLane?_mSC[i].specificLane:'';
				var _period = _mSC[i].period=='60.0'?'uur':_mSC[i].period;

				var _vehicleLength = '';
				if (_mSC[i].specificVehicleCharacteristics) {
					var _svcTmp = _mSC[i].specificVehicleCharacteristics;
					for (var j=0; j<_svcTmp.length;j++) {
						if (_svcTmp[j].comparisonOperator) {
							switch (_svcTmp[j].comparisonOperator) {
								case 'lessThan' :
									_vehicleLength+='<';
									break;
								case 'lessThanOrEqualTo' :
									_vehicleLength+='<=';
									break;
								case 'greaterThanOrEqualTo' :
									_vehicleLength+='>=';
									break;
								case 'greaterThan' :
									_vehicleLength+='>';
									break;
								default:

							}
							_vehicleLength += _svcTmp[j].vehicleLength;

						} else {
							_vehicleLength+= _svcTmp[j].vehicleType;
						}
					}
				}
				if (_vehicleLength != '') {
					_vehicleLength = '(' + _vehicleLength + ')';
				}


				if (_measuredValues[i].vehicleFlowRate) {
					_content+= '<BR/>' + 'Vehicle ' + _vehicleLength + ' flow rate: ' + _measuredValues[i].vehicleFlowRate + ' /' + _period + ' ' + _lane + ' ' + _timeFormatted;
				} else if (_measuredValues[i].speed) {
					_content+= '<BR/>' + 'Speed ' + _vehicleLength + ': ' + _measuredValues[i].speed + 'km /' + _period + ' ' + _lane + ' ' + _timeFormatted;
				} else {
					_content+= '<BR/>' + 'index: ' + _measuredValues[i].index + ' ' + _lane + ' ' + _timeFormatted;
				}
			}
			} else {
				if (feature.properties.trafficFlow && feature.properties.trafficFlow.total) {
					_content+= '<BR/>' + 'Total vehicle flow rate: ' + feature.properties.trafficFlow.total + ' per uur';
				}
				if (feature.properties.trafficSpeed && feature.properties.trafficSpeed.high) {
					_content+= '<BR/>' + '      vehicle speed: ' + feature.properties.trafficSpeed.low + '-' + feature.properties.trafficSpeed.high + ' km/uur';
				}
			}
			_content += '</DIV>';

			layer.bindPopup(_content);
/*
            if (feature.properties && feature.properties.bu_naam) {
                layer.bindPopup(feature.properties.bu_naam +
				'<BR/><DIV style="width:132px;">------------------------</DIV>' +
				'<BR/>' + 'Leeftijd  0-14jr: ' + feature.properties.p_00_14_jr + '%' +
				'<BR/>' + 'Leeftijd 15-24jr: ' + feature.properties.p_15_24_jr + '%' +
				'<BR/>' + 'Leeftijd 25-44jr: ' + feature.properties.p_25_44_jr + '%' +
				'<BR/>' + 'Leeftijd 45-64jr: ' + feature.properties.p_45_64_jr + '%' +
				'<BR/>' + 'Leeftijd 65-e.o.: ' + feature.properties.p_65_eo_jr + '%');
            }
*/

			(function(layer, properties) {
				// Create a mouseclick event
      			layer.on("click", function (e) {
					//alert("Lat, Lon : " + e.latlng.lat + ", " + e.latlng.lng);
/*					var rookRisicoMarker = L.circleMarker([e.latlng.lat, e.latlng.lng] ,{title: 'unselected', dateCreated: new Date() }).addTo(map);
					ajaxGetData(siteAireas + "/data/aireas/setBuurtRookRisicoMarker/*?lat=" + e.latlng.lat + "&lng=" + e.latlng.lng,
						function(data) {
							var result = JSON.parse(data);
							if (result.markerOk) {
								rookRisicoMarker.setStyle({color: 'green', fillColor:'green'});
							} else {
								rookRisicoMarker.setStyle({color: 'yellow', fillColor:'red'});
							}
						}
					);
*/				});
				// Create a mouseover event
      			layer.on("mouseover", function (e) {
					//layer.setStyle({fillColor: 'grey'});
				});
      			// Create a mouseout event that undoes the mouseover changes
      			layer.on("mouseout", function (e) {
        			// Start by reverting the style back
        			//layer.setStyle(e.layer.options.style(e.target.feature) ); // layer.setStyle(defaultStyle);
      			});
      			// Close the "anonymous" wrapper function, and call it while passing
      			// in the variables necessary to make the events work the way we want.
			})(layer, feature.properties);
        }






		ndwTrafficSpeedLayerTest = new L.geoJson(null, {
			  layerType:"ndwTrafficSpeedLayerTest"
			, style: function (feature) {
				var _color = "#000000";
				var _fillOpacity = 0.1;
/*
				if (feature.properties.aantal_markers>0) 	{
					_color = "#FF0000";
					_fillOpacity = 0.4;
				};
				if (feature.properties.aantal_markers>5) 	{
					_color = "#FF0000";
					_fillOpacity = 0.6;
				};
				if (feature.properties.aantal_markers>10) 	{
					_color = "#FF0000";
					_fillOpacity = 0.8;
				};
*/
        		return {color: '#000', fillColor:_color, weight:1, opacity:0.8, fillOpacity:_fillOpacity };
    			}
			, onEachFeature:onEachNdwTrafficSpeedLayerTestFeature
			, refreshData:true
			, loadDataOnce:
				function () {
					var mapCenter = map.getCenter();
//					ajaxGetData(APRI.getConfig().urlSystemRoot + "/data/aireas/getCbsBuurtInfo/*",

					//http://localhost:4000/SCAPE604/openiod?SERVICE=SOS&REQUEST=GetTrafficSpeed&location=EHV&format=json

					ajaxGetData("http://localhost:4000/SCAPE604/openiod?SERVICE=SOS&REQUEST=GetTrafficSpeed&location=EHV&format=json", //?lat=" + mapCenter.lat + "&lng=" + mapCenter.lng,
						function(data) {
							ndwTrafficSpeedLayerTest.addData(JSON.parse(data));
						}
					)
            	}
		});

		// NDW traffic speed data
        function onEachNdwTrafficSpeedLayerTestFeature (feature, layer) {
            // does this feature have a property named popupContent?
			var _time, _timeFormatted='';
			_time = new Date(feature.properties.site.measurementTimeDefault);
			_timeFormatted = moment(_time).format('YYYY/MM/DD HH:mm');
			var _content = '<DIV><DIV style="width:400px;">Traffic flowrate / speed ' + _timeFormatted + ' (' + feature.properties.site._id.id + ')</DIV>';

			var _measuredValues = feature.properties.site.measuredValues;
			var _mSC = feature.properties.site.measurementSpecificCharacteristics;

			for (var i=0;i<_measuredValues.length;i++) {

				_timeFormatted='';
				if (_measuredValues[i].time && _measuredValues[i].time != feature.properties.site.measurementTimeDefault ) {
					var _tmpTime = _measuredValues[i].time;
					_time = new Date(_tmpTime);
					_timeFormatted = moment(_time).format('HH:mm');
				}

				var _lane = _mSC[i].specificLane?_mSC[i].specificLane:'';
				var _period = _mSC[i].period=='60.0'?'uur':_mSC[i].period;

				var _vehicleLength = '';
				if (_mSC[i].specificVehicleCharacteristics) {
					var _svcTmp = _mSC[i].specificVehicleCharacteristics;
					for (var j=0; j<_svcTmp.length;j++) {
						if (_svcTmp[j].comparisonOperator) {
							switch (_svcTmp[j].comparisonOperator) {
								case 'lessThan' :
									_vehicleLength+='<';
									break;
								case 'lessThanOrEqualTo' :
									_vehicleLength+='<=';
									break;
								case 'greaterThanOrEqualTo' :
									_vehicleLength+='>=';
									break;
								case 'greaterThan' :
									_vehicleLength+='>';
									break;
								default:

							}
							_vehicleLength += _svcTmp[j].vehicleLength;

						} else {
							_vehicleLength+= _svcTmp[j].vehicleType;
						}
					}
				}
				if (_vehicleLength != '') {
					_vehicleLength = '(' + _vehicleLength + ')';
				}


				if (_measuredValues[i].vehicleFlowRate) {
					_content+= '<BR/>' + 'Vehicle ' + _vehicleLength + ' flow rate: ' + _measuredValues[i].vehicleFlowRate + ' /' + _period + ' ' + _lane + ' ' + _timeFormatted;
				} else if (_measuredValues[i].speed) {
					_content+= '<BR/>' + 'Speed ' + _vehicleLength + ': ' + _measuredValues[i].speed + 'km /' + _period + ' ' + _lane + ' ' + _timeFormatted;
				} else {
					_content+= '<BR/>' + 'index: ' + _measuredValues[i].index + ' ' + _lane + ' ' + _timeFormatted;
				}
			}
			_content += '</DIV>';

			layer.bindPopup(_content);
/*
            if (feature.properties && feature.properties.bu_naam) {
                layer.bindPopup(feature.properties.bu_naam +
				'<BR/><DIV style="width:132px;">------------------------</DIV>' +
				'<BR/>' + 'Leeftijd  0-14jr: ' + feature.properties.p_00_14_jr + '%' +
				'<BR/>' + 'Leeftijd 15-24jr: ' + feature.properties.p_15_24_jr + '%' +
				'<BR/>' + 'Leeftijd 25-44jr: ' + feature.properties.p_25_44_jr + '%' +
				'<BR/>' + 'Leeftijd 45-64jr: ' + feature.properties.p_45_64_jr + '%' +
				'<BR/>' + 'Leeftijd 65-e.o.: ' + feature.properties.p_65_eo_jr + '%');
            }
*/

			(function(layer, properties) {
				// Create a mouseclick event
      			layer.on("click", function (e) {
					//alert("Lat, Lon : " + e.latlng.lat + ", " + e.latlng.lng);
/*					var rookRisicoMarker = L.circleMarker([e.latlng.lat, e.latlng.lng] ,{title: 'unselected', dateCreated: new Date() }).addTo(map);
					ajaxGetData(siteAireas + "/data/aireas/setBuurtRookRisicoMarker/*?lat=" + e.latlng.lat + "&lng=" + e.latlng.lng,
						function(data) {
							var result = JSON.parse(data);
							if (result.markerOk) {
								rookRisicoMarker.setStyle({color: 'green', fillColor:'green'});
							} else {
								rookRisicoMarker.setStyle({color: 'yellow', fillColor:'red'});
							}
						}
					);
*/				});
				// Create a mouseover event
      			layer.on("mouseover", function (e) {
					//layer.setStyle({fillColor: 'grey'});
				});
      			// Create a mouseout event that undoes the mouseover changes
      			layer.on("mouseout", function (e) {
        			// Start by reverting the style back
        			//layer.setStyle(e.layer.options.style(e.target.feature) ); // layer.setStyle(defaultStyle);
      			});
      			// Close the "anonymous" wrapper function, and call it while passing
      			// in the variables necessary to make the events work the way we want.
			})(layer, feature.properties);
        }







/*
		aireasMeetkastenLayer = new L.geoJson(null,{layerType:"aireasMeetkastenLayer"
			, onEachFeature:onEachAireasMeetkastFeature
			, pointToLayer: function (feature, latlng) {
				var marker = airboxMarkerGreen;
			if (feature.properties.airbox == '2.cal' |
					feature.properties.airbox == '3.cal' |
					feature.properties.airbox == '21.cal' |
					feature.properties.airbox == '16.cal' |
					feature.properties.airbox == '39.cal' ) {
						marker = airboxMarkerBlue;
				} else {
					if (feature.properties.airbox == '9.cal' |
						feature.properties.airbox == '12.cal' |
						feature.properties.airbox == '23.cal' |
						feature.properties.airbox == '31.cal' |
						feature.properties.airbox == '33.cal' ) {
						marker = airboxMarkerDarkPurple;
					} else {
						//return -1;
					}
				}
				return L.marker(latlng, { icon: marker} );
			}
			, refreshData:true
			, loadDataOnce:
				function () {
					ajaxGetData(siteAireas + "/data/aireas/getActualMeasures/*",
						function(data) {
							aireasMeetkastenLayer.addData(JSON.parse(data));
						}
					)
            	}
		});
*/





		nsStationsLayer = new L.geoJson(null,{layerType:"nsStationsLayer"
			, onEachFeature:onEachNsStationFeature
			, pointToLayer: function (feature, latlng) {
				return L.marker(latlng, { icon: trainIcon} );
				}
			, refreshData:true
			, loadDataOnce:
				function () {
					ajaxGetData(APRI.getConfig().urlSystemRoot + "/ns/stationsgeo/",
						function(data) {
							nsStationsLayer.addData(JSON.parse(data));
						}
					)
            	}
		});

        function onEachNsStationFeature (feature, layer) {
            // does this feature have a property named popupContent?
            if (feature.properties && feature.properties.name && feature.properties.type) {
                layer.bindPopup(feature.properties.name + ' / ' + feature.properties.type  + ' / ' + feature.properties.UICCode );
            }

			(function(layer, properties) {
				// Create a mouseover event
      			layer.on("mouseover", function (e) {
        			// Create a popup with a unique ID linked to this record
					var popup 	= document.createElement('div');
					popup.id 	= 'popup-' + properties.UICCode;
					popup.style.position = 'absolute';
					popup.style.bottom = '85px';
					popup.style.left = '50px';
					popup.style.zIndex = 1002;
					popup.style.backgroundColor = 'white';
					popup.style.padding = '8px';
					popup.style.border = '1px solid #ccc';
        			// Insert a headline into that popup
					var head = document.createElement('div');
					var _innerHtml = properties.type + ": " + properties.name;
					head.innerHTML = _innerHtml;
					head.style.fontSize = '16px';
					head.style.marginBottom = '3px';
					popup.appendChild(head);
					mapPanes.popupPane.appendChild(popup);

				});
      			// Create a mouseout event that undoes the mouseover changes
      			layer.on("mouseout", function (e) {
					document.getElementById('popup-' + properties.UICCode).remove();
      			});
      			// Close the "anonymous" wrapper function, and call it while passing
      			// in the variables necessary to make the events work the way we want.
			})(layer, feature.properties);
        }



/*


		// http://geoservices.knmi.nl/adaguc_portal/?srs=EPSG%3A28992&bbox=-47780.898876404506,300000,342780.8988764045,630000&service=http%253A%252F%252Fgeoservices.knmi.nl%252Fcgi-bin%252FRADNL_OPER_R___25PCPRR_L3.cgi%253F&layer=RADNL_OPER_R___25PCPRR_L3_COLOR%2524image%252Fpng%2524true%2524default%25241%25240&selected=0&dims=time$current&baselayers=world_raster$nl_world_line
var testWMS = "http://geoservices.knmi.nl/cgi-bin/RADNL_OPER_R___25PCPRR_L3.cgi"
var knmiLayer = L.nonTiledLayer.wms(testWMS, {
    layers: 'RADNL_OPER_R___25PCPRR_L3_COLOR',
    format: 'image/png',
    transparent: true,
    attribution: 'KNMI'
});

var testTimeLayer = L.timeDimension.layer.wms(knmiLayer);
testTimeLayer.addTo(map);

var testLegend = L.control({
    position: 'topright'
});

testLegend.onAdd = function(map) {
    var src = testWMS + "?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetLegendGraphic&LAYER=RADNL_OPER_R___25PCPRR_L3_COLOR&format=image/png&STYLE=default";
    var div = L.DomUtil.create('div', 'info legend');
    div.style.width = '65px';
    div.style.height = '280px';
    div.style['background-image'] = 'url(' + src + ')';
    return div;
};
testLegend.addTo(map);

L.control.coordinates({
    position: "bottomright",
    decimals: 3,
    labelTemplateLat: "Latitude: {y}",
    labelTemplateLng: "Longitude: {x}",
    useDMS: true,
    enableUserInput: false
}).addTo(map);

*/








		// http://geodata.nationaalgeoregister.nl/nwbwegen/wms?request=GetCapabilities
        nwbWegHectoPuntenLayer = L.tileLayer.wms(siteProtocol+sitePrefixExtern+"geodata.nationaalgeoregister.nl/nwbwegen/wms", {
        // ?service=WMS&version=1.1.0&bbox=123657.03125,499459.625,129679.1328125,504556.78125&width=512&height=433&srs=EPSG:28992&format=
            layers: 'hectopunten',
            format: 'image/png',
            transparent: true,
			tiled: true,
			crs: RDcrs,
		//	tilesorigin: [-180, 90],
            attribution: "NWB Hectopunten",
			zoomTo: 13
        });
        nwbWegVakkenLayer = L.tileLayer.wms(siteProtocol+sitePrefixExtern+"geodata.nationaalgeoregister.nl/nwbwegen/wms", {
        // ?service=WMS&version=1.1.0&bbox=123657.03125,499459.625,129679.1328125,504556.78125&width=512&height=433&srs=EPSG:28992&format=
            layers: 'wegvakken',
            format: 'image/png',
            transparent: true,
			tiled: true,
			crs: RDcrs,
		//	tilesorigin: [-180, 90],
            attribution: "NWB Wegvakken",
			zoomTo: 13
        });


// ===============   NSL WMS Eindhoven Lucht gegevens start
//        nslSegmentEindhovenWMSLayer = new L.tileLayer.wms(siteProtocol+"//scapeler.com/geoserver/scapeler/wms", {  //c5v511
        nslSegmentEindhovenWMSLayer = new L.tileLayer.wms("http://scapeler.com/geoserver/scapeler/wms", {  //c5v511
        // ?service=WMS&version=1.1.0&bbox=123657.03125,499459.625,129679.1328125,504556.78125&width=512&height=433&srs=EPSG:28992&format=
            layers: 'scapeler:nsl_segment_ehv2013',
            format: 'image/png',
            transparent: true,
			tiled: false,
		//	styles: "aireasCELC",
		//	tilesorigin: [-180, 90],
			//crs: L.CRS.EPSG4326, //	 'EPSG:4326',
			//crs: L.CRS('EPSG:4326'),
			srs: 'EPSG:28992',
            attribution: "NSL segment Eindhoven 2013"
        });
// ===============  NSL WMS Eindhoven Lucht gegevens end
// ===============   NSL WMS Eindhoven Lucht gegevens start
        nslResultEindhovenWMSLayer = new L.tileLayer.wms("http://scapeler.com/geoserver/scapeler/wms", {  //c5v511
        // ?service=WMS&version=1.1.0&bbox=123657.03125,499459.625,129679.1328125,504556.78125&width=512&height=433&srs=EPSG:28992&format=
            layers: 'scapeler:nsl_result_ehv2013',
            format: 'image/png',
            transparent: true,
			tiled: false,
		//	styles: "aireasCELC",
		//	tilesorigin: [-180, 90],
			//crs: L.CRS.EPSG4326, //	 'EPSG:4326',
			//crs: L.CRS('EPSG:4326'),
			srs: 'EPSG:28992',
            attribution: "NSL result Eindhoven 2013"
        });
// ===============  NSL WMS Eindhoven Lucht gegevens end
// ===============   NSL WMS Eindhoven Lucht gegevens start
        nslReceptorEindhovenWMSLayer = new L.tileLayer.wms("http://scapeler.com/geoserver/scapeler/wms", {  //c5v511
        // ?service=WMS&version=1.1.0&bbox=123657.03125,499459.625,129679.1328125,504556.78125&width=512&height=433&srs=EPSG:28992&format=
            layers: 'scapeler:nsl_receptor_ehv2013',
            format: 'image/png',
            transparent: true,
			tiled: false,
		//	styles: "aireasCELC",
		//	tilesorigin: [-180, 90],
			//crs: L.CRS.EPSG4326, //	 'EPSG:4326',
			//crs: L.CRS('EPSG:4326'),
			srs: 'EPSG:28992',
            attribution: "NSL receptor Eindhoven 2013"
        });
// ===============  NSL WMS Eindhoven Lucht gegevens end
// ===============   NSL WMS Eindhoven Lucht gegevens start
        nslMeasureEindhovenWMSLayer = new L.tileLayer.wms("http://scapeler.com/geoserver/scapeler/wms", {  //c5v511
        // ?service=WMS&version=1.1.0&bbox=123657.03125,499459.625,129679.1328125,504556.78125&width=512&height=433&srs=EPSG:28992&format=
            layers: 'scapeler:nsl_measure_ehv2013',
            format: 'image/png',
            transparent: true,
			tiled: false,
		//	styles: "aireasCELC",
		//	tilesorigin: [-180, 90],
			//crs: L.CRS.EPSG4326, //	 'EPSG:4326',
			//crs: L.CRS('EPSG:4326'),
			srs: 'EPSG:28992',
            attribution: "NSL measure Eindhoven 2013"
        });
// ===============  NSL WMS Eindhoven Lucht gegevens end


// ===============  Alterra WMS start
        dankPm10InvangWMSLayer = new L.tileLayer.wms("http://geodata.rivm.nl/geoserver/dank/wms", {  //c5v511
        // ?service=WMS&version=1.1.0&bbox=123657.03125,499459.625,129679.1328125,504556.78125&width=512&height=433&srs=EPSG:28992&format=
            layers: 'dank:altr_a15_gv_lzuifijnstof',
            format: 'image/png',
            transparent: true,
			tiled: false,
		//	styles: "aireasCELC",
		//	tilesorigin: [-180, 90],
			//crs: L.CRS.EPSG4326, //	 'EPSG:4326',
			//crs: L.CRS('EPSG:4326'),
			srs: 'EPSG:28992',
            attribution: "DANK PM10 Invang 2014-11"
        });
// ===============  Alterra WMS end

// ===============  Alterra WMS start
        dankWandelWMSLayer = new L.tileLayer.wms("http://geodata.rivm.nl/geoserver/dank/wms", {  //c5v511
        // ?service=WMS&version=1.1.0&bbox=123657.03125,499459.625,129679.1328125,504556.78125&width=512&height=433&srs=EPSG:28992&format=
            layers: 'dank:altr_a23_gi_wandelaanbod',
            format: 'image/png',
            transparent: true,
			tiled: false,
		//	styles: "aireasCELC",
		//	tilesorigin: [-180, 90],
			//crs: L.CRS.EPSG4326, //	 'EPSG:4326',
			//crs: L.CRS('EPSG:4326'),
			srs: 'EPSG:28992',
            attribution: "DANK Wandelaanbod"
        });
// ===============  Alterra WMS end

// ===============  Alterra WMS start
        dankFietsWMSLayer = new L.tileLayer.wms("http://geodata.rivm.nl/geoserver/dank/wms", {  //c5v511
        // ?service=WMS&version=1.1.0&bbox=123657.03125,499459.625,129679.1328125,504556.78125&width=512&height=433&srs=EPSG:28992&format=
            layers: 'dank:altr_a22_gi_fietsaanbod',
            format: 'image/png',
            transparent: true,
			tiled: false,
		//	styles: "aireasCELC",
		//	tilesorigin: [-180, 90],
			//crs: L.CRS.EPSG4326, //	 'EPSG:4326',
			//crs: L.CRS('EPSG:4326'),
			srs: 'EPSG:28992',
            attribution: "DANK Fietsaanbod"
        });
// ===============  Alterra WMS end

// ===============  Alterra WMS start
        dankLandBelevingWMSLayer = new L.tileLayer.wms("http://geodata.rivm.nl/geoserver/dank/wms", {  //c5v511
        // ?service=WMS&version=1.1.0&bbox=123657.03125,499459.625,129679.1328125,504556.78125&width=512&height=433&srs=EPSG:28992&format=
            layers: 'dank:altr_a21_gv_landbeleving',
            format: 'image/png',
            transparent: true,
			tiled: false,
		//	styles: "aireasCELC",
		//	tilesorigin: [-180, 90],
			//crs: L.CRS.EPSG4326, //	 'EPSG:4326',
			//crs: L.CRS('EPSG:4326'),
			srs: 'EPSG:28992',
            attribution: "DANK Landbeleving"
        });
// ===============  Alterra WMS end

// ===============  Alterra WMS start
        dankBodemMaatregelCTotaalWMSLayer = new L.tileLayer.wms("http://geodata.rivm.nl/geoserver/dank/wms", {  //c5v511
        // ?service=WMS&version=1.1.0&bbox=123657.03125,499459.625,129679.1328125,504556.78125&width=512&height=433&srs=EPSG:28992&format=
            layers: 'dank:altr_a14_ri_bodemctotaal',
            format: 'image/png',
            transparent: true,
			tiled: false,
		//	styles: "aireasCELC",
		//	tilesorigin: [-180, 90],
			//crs: L.CRS.EPSG4326, //	 'EPSG:4326',
			//crs: L.CRS('EPSG:4326'),
			srs: 'EPSG:28992',
            attribution: "Alterra Bodemmaatregel C totaal"
        });
// ===============  Alterra WMS end


// ===============  Alterra WMS start
        dankBomenWMSLayer = new L.tileLayer.wms("http://geodata.rivm.nl/geoserver/dank/wms", {  //c5v511
        // ?service=WMS&version=1.1.0&bbox=123657.03125,499459.625,129679.1328125,504556.78125&width=512&height=433&srs=EPSG:28992&format=
            layers: 'rivm_084_20170314_gm_Bomenkaart',
            format: 'image/png',
            transparent: true,
			tiled: false,
		//	styles: "aireasCELC",
		//	tilesorigin: [-180, 90],
			//crs: L.CRS.EPSG4326, //	 'EPSG:4326',
			//crs: L.CRS('EPSG:4326'),
			srs: 'EPSG:28992',
            attribution: "DANK Bomenkaart"
        });
// ===============  Alterra WMS end

// ===============  Alterra WMS start
        dankBiomassaHoutvoorraadWMSLayer = new L.tileLayer.wms("http://geodata.rivm.nl/geoserver/dank/wms", {  //c5v511
        // ?service=WMS&version=1.1.0&bbox=123657.03125,499459.625,129679.1328125,504556.78125&width=512&height=433&srs=EPSG:28992&format=
            layers: 'dank:altr_a25_ir_sthoutvrrdgm',
            format: 'image/png',
            transparent: true,
			tiled: false,
		//	styles: "aireasCELC",
		//	tilesorigin: [-180, 90],
			//crs: L.CRS.EPSG4326, //	 'EPSG:4326',
			//crs: L.CRS('EPSG:4326'),
			srs: 'EPSG:28992',
            attribution: "DANK Biomassa houtvoorraad"
        });
// ===============  Alterra WMS end

// ===============  Alterra WMS start
        dankBoomHoogteWMSLayer = new L.tileLayer.wms("http://geodata.rivm.nl/geoserver/dank/wms", {  //c5v511
        // ?service=WMS&version=1.1.0&bbox=123657.03125,499459.625,129679.1328125,504556.78125&width=512&height=433&srs=EPSG:28992&format=
            layers: 'dank:rivm_087_20170415_gm_boomhoogte',
            format: 'image/png',
            transparent: true,
			tiled: false,
		//	styles: "aireasCELC",
		//	tilesorigin: [-180, 90],
			//crs: L.CRS.EPSG4326, //	 'EPSG:4326',
			//crs: L.CRS('EPSG:4326'),
			srs: 'EPSG:28992',
            attribution: "DANK Boomhoogte"
        });
// ===============  Alterra WMS end

// ===============  Alterra WMS start
        dankBiomassaTakTopSnoeiWMSLayer = new L.tileLayer.wms("http://geodata.rivm.nl/geoserver/dank/wms", {  //c5v511
        // ?service=WMS&version=1.1.0&bbox=123657.03125,499459.625,129679.1328125,504556.78125&width=512&height=433&srs=EPSG:28992&format=
            layers: 'dank:altr_a29_ri_taktopsnoeih',
            format: 'image/png',
            transparent: true,
			tiled: false,
		//	styles: "aireasCELC",
		//	tilesorigin: [-180, 90],
			//crs: L.CRS.EPSG4326, //	 'EPSG:4326',
			//crs: L.CRS('EPSG:4326'),
			srs: 'EPSG:28992',
            attribution: "DANK Biomassa tak/top snoei"
        });
// ===============  Alterra WMS end

// ===============  Alterra WMS start
        dankWarmteDalingWMSLayer = new L.tileLayer.wms("http://geodata.rivm.nl/geoserver/dank/wms", {  //c5v511
        // ?service=WMS&version=1.1.0&bbox=123657.03125,499459.625,129679.1328125,504556.78125&width=512&height=433&srs=EPSG:28992&format=
            layers: 'dank:rivm_r59_gm_dalingUHImaxmediaan',
            format: 'image/png',
            transparent: true,
			tiled: false,
		//	styles: "aireasCELC",
		//	tilesorigin: [-180, 90],
			//crs: L.CRS.EPSG4326, //	 'EPSG:4326',
			//crs: L.CRS('EPSG:4326'),
			srs: 'EPSG:28992',
            attribution: "DANK Warmte daling"
        });
// ===============  Alterra WMS end



// ===============   OV WMS Agency Stops start
        ovStopsWMSLayer = new L.tileLayer.wms("http://scapeler.com/geoserver/scapeler/wms", {  //c5v511
        // ?service=WMS&version=1.1.0&bbox=123657.03125,499459.625,129679.1328125,504556.78125&width=512&height=433&srs=EPSG:28992&format=
            layers: 'scapeler:gtfs_stops',
            format: 'image/png',
            transparent: true,
			tiled: false,
		//	styles: "aireasCELC",
		//	tilesorigin: [-180, 90],
			crs: L.CRS.EPSG4326, //	 'EPSG:4326',
		//	crs: L.CRS('EPSG:4326'),
			//srs: 'EPSG:28992',
            attribution: "OV Stops"
        });
// ===============  OV WMS Agency Stops end

// ===============   OV WMS Agency Shapes start
        ovShapesWMSLayer = new L.tileLayer.wms("http://scapeler.com/geoserver/scapeler/wms", {  //c5v511
        // ?service=WMS&version=1.1.0&bbox=123657.03125,499459.625,129679.1328125,504556.78125&width=512&height=433&srs=EPSG:28992&format=
            layers: 'scapeler:gtfs_shapes',
            format: 'image/png',
            transparent: true,
			tiled: false,
		//	styles: "aireasCELC",
		//	tilesorigin: [-180, 90],
			crs: L.CRS.EPSG4326, //	 'EPSG:4326',
		//	crs: L.CRS('EPSG:4326'),
			//srs: 'EPSG:28992',
            attribution: "OV Shapes"
        });
// ===============  OV WMS Agency Shapes end

// ===============   PDOK WMS
        droneNoFlyZoneLandingsiteLayer = new L.tileLayer.wms("https://geodata.nationaalgeoregister.nl/dronenoflyzones/wms", {  //c5v511
        // ?service=WMS&version=1.1.0&bbox=123657.03125,499459.625,129679.1328125,504556.78125&width=512&height=433&srs=EPSG:28992&format=
            layers: 'landingsite',
            format: 'image/png',
            transparent: true,
			tiled: false,
		//	styles: "aireasCELC",
		//	tilesorigin: [-180, 90],
			crs: L.CRS.EPSG4326, //	 'EPSG:4326',
		//	crs: L.CRS('EPSG:4326'),
			//srs: 'EPSG:28992',
            attribution: "Drone noflyzone"
        });
// ===============
// ===============   PDOK WMS
        droneNoFlyZoneLuchtvaartLayer = new L.tileLayer.wms("https://geodata.nationaalgeoregister.nl/dronenoflyzones/wms", {  //c5v511
        // ?service=WMS&version=1.1.0&bbox=123657.03125,499459.625,129679.1328125,504556.78125&width=512&height=433&srs=EPSG:28992&format=
            layers: 'luchtvaartgebieden',
            format: 'image/png',
            transparent: true,
			tiled: false,
		//	styles: "aireasCELC",
		//	tilesorigin: [-180, 90],
			crs: L.CRS.EPSG4326, //	 'EPSG:4326',
		//	crs: L.CRS('EPSG:4326'),
			//srs: 'EPSG:28992',
            attribution: "Drone noflyzone"
        });
// ===============

// ===============   PDOK WMS
        AANLayer = new L.tileLayer.wms("https://geodata.nationaalgeoregister.nl/aan/wms", {  //c5v511
        // ?service=WMS&version=1.1.0&bbox=123657.03125,499459.625,129679.1328125,504556.78125&width=512&height=433&srs=EPSG:28992&format=
            layers: 'aan',
            format: 'image/png',
            transparent: true,
			tiled: false,
		//	styles: "aireasCELC",
		//	tilesorigin: [-180, 90],
			crs: RDcrs,
			//crs: L.CRS.EPSG4326, //	 'EPSG:4326',
		//	crs: L.CRS('EPSG:4326'),
			//srs: 'EPSG:28992',
            attribution: "AAN"
        });
// ===============



//http://afnemers.ruimtelijkeplannen.nl/afnemers2012/services?request=GetCapabilities&service=WMS&version=1.3.0
//http://afnemers.ruimtelijkeplannen.nl/afnemers2012/services?request=GetCapabilities&service=WMS&version=1.3.0
//https://afnemers.ruimtelijkeplannen.nl/afnemers2012/services?&SERVICE=WMS&REQUEST=GetMap&VERSION=1.1.1&LAYERS=BP%3AEnkelbestemming&STYLES=&FORMAT=image%2Fpng&TRANSPARENT=true&HEIGHT=256&WIDTH=256&TILED=true&LEGENDPNG=http%3A%2F%2Fgeodata.nationaalgeoregister.nl%2Fplu%2Fwms%3Frequest%3DGetLegendGraphic%26version%3D1.3.0%26service%3DWMS%26layer%3DEnkelbestemming%26style%3DEnkelbestemming%26format%3Dimage%2Fpng&ZOOMTO=13&SRS=EPSG%3A28992&BBOX=156256.91706183183,378896.9353807878,159315.85097471345,381944.5079138001

        EnkelbestemmingLayer = L.tileLayer.wms(//siteProtocol+sitePrefixExtern+
		"http://" + "afnemers.ruimtelijkeplannen.nl/afnemers2012/services?", {
        // ?service=WMS&version=1.1.0&bbox=123657.03125,499459.625,129679.1328125,504556.78125&width=512&height=433&srs=EPSG:28992&format=
            layers: 'BP:Enkelbestemming',
            format: 'image/png',
            transparent: true,
			tiled: true,
            crs: RDcrs,
        //    crs: L.CRS.EPSG28992,
		//	tilesorigin: [-180, 90],
            attribution: "BP:Enkelbestemming",
			legendPng: "http://geodata.nationaalgeoregister.nl/plu/wms?request=GetLegendGraphic&version=1.3.0&service=WMS&layer=Enkelbestemming&style=Enkelbestemming&format=image/png",
			zoomTo: 12
        });
        DubbelbestemmingLayer = L.tileLayer.wms(siteProtocol+sitePrefixExtern+"afnemers.ruimtelijkeplannen.nl/afnemers/services/wms", {
        // ?service=WMS&version=1.1.0&bbox=123657.03125,499459.625,129679.1328125,504556.78125&width=512&height=433&srs=EPSG:28992&format=
            layers: 'BP:Dubbelbestemming',
            format: 'image/png',
            transparent: true,
			tiled: true,
            crs: RDcrs,
        //    crs: L.CRS.EPSG28992,
		//	tilesorigin: [-180, 90],
            attribution: "BP:Dubbelbestemming",
			zoomTo: 13
        });
        BestemmingsplangebiedLayer = L.tileLayer.wms(siteProtocol+sitePrefixExtern+"afnemers.ruimtelijkeplannen.nl/afnemers/services/wms", {
        // ?service=WMS&version=1.1.0&bbox=123657.03125,499459.625,129679.1328125,504556.78125&width=512&height=433&srs=EPSG:28992&format=
            layers: 'BP:Bestemmingsplangebied',
            format: 'image/png',
            transparent: true,
			tiled: true,
            crs: RDcrs,
//            crs: L.CRS.EPSG28992,
		//	tilesorigin: [-180, 90],
            attribution: "Bestemmingsplangebied"
        });
        BouwvlakLayer = L.tileLayer.wms(siteProtocol+sitePrefixExtern+"afnemers.ruimtelijkeplannen.nl/afnemers/services/wms", {
        // ?service=WMS&version=1.1.0&bbox=123657.03125,499459.625,129679.1328125,504556.78125&width=512&height=433&srs=EPSG:28992&format=
            layers: 'BP:Bouwvlak',
            format: 'image/png',
            transparent: true,
			tiled: true,
            crs: RDcrs,
        //    crs: L.CRS.EPSG28992,
		//	tilesorigin: [-180, 90],
            attribution: "Bouwvlak",
			zoomTo: 13
        });
        GebiedsaanduidingLayer = L.tileLayer.wms(siteProtocol+sitePrefixExtern+"afnemers.ruimtelijkeplannen.nl/afnemers/services/wms", {
        // ?service=WMS&version=1.1.0&bbox=123657.03125,499459.625,129679.1328125,504556.78125&width=512&height=433&srs=EPSG:28992&format=
            layers: 'BP:Gebiedsaanduiding',
            format: 'image/png',
            transparent: true,
			tiled: true,
            crs: RDcrs,
        //    crs: L.CRS.EPSG28992,
		//	tilesorigin: [-180, 90],
            attribution: "BP:Gebiedsaanduiding",
			zoomTo: 13
        });

        Structuurvisieplangebied_G_Layer = L.tileLayer.wms(siteProtocol+sitePrefixExtern+"afnemers.ruimtelijkeplannen.nl/afnemers/services/wms", {
        // ?service=WMS&version=1.1.0&bbox=123657.03125,499459.625,129679.1328125,504556.78125&width=512&height=433&srs=EPSG:28992&format=
            layers: 'GSV:Structuurvisieplangebied',
            format: 'image/png',
            transparent: true,
			tiled: true,
            crs: RDcrs,
        //    crs: L.CRS.EPSG28992,
		//	tilesorigin: [-180, 90],
            attribution: "GSV:Structuurvisieplangebied"
        });


		initPopupInfoCtrl({container:mapPanes.controlerPane});


//		initThreeBase({container:mapPanes.controlerPane});
//		threeScene.createBox();

		//initWebGlBase({container:mapPanes.controlerPane});
//		webGlContext.createBox();


//		if (navigator.geolocation) {
//			geoLocationCurrentPosition = navigator.geolocation.getCurrentPosition(function(position) {
//  				//do_something(position.coords.latitude, position.coords.longitude);
//			});
//		}


		gtfsOms = new OverlappingMarkerSpiderfier(map);
		var gtfsOmsPopup = new L.Popup();
		gtfsOms.addListener('click', function(marker) {
  			gtfsOmsPopup.setContent(marker.desc);
  			gtfsOmsPopup.setLatLng(marker.getLatLng());
  			map.openPopup(e.layer.gtfsOmsPopup);
		});
		gtfsOms.addListener('spiderfy', function(markers) {
  			map.closePopup();
		});

		initLayersControl();


	}

//===========================================================================  end of constructor

	var secureSite;
	var siteProtocol;
	var sitePrefixExtern;

	var map,  apriLeafLetBase, popupInfoCtrl, threeScene, webGlContext;
	var baseMaps, mapPanes;
	var aireasBaseMaps;

	var retrievedDateMaxTrafficFlow;
	var retrievedDateCacheTrafficFlow;

	var geoLocationCurrentPosition;

	var gemeenten, gemeenteSelected, dropDownGemeenteContainer, dropDownGemeenteDispatchers;

	var aireasHistGridGemLayer, aireasTileLayer, openBasisKaartLayer, PDOK_BAG_pand_Layer, pdokLuchtfotoLayer,osmKaartLayer,
		projectAirportLayer, bioMassaCentraleEindhovenLayer, videoCameraLayer, participationLayer, solutionsLayer, parkingLayer, localProductsLayer,
		cbsBuurtInfoLayer, cbsBuurtRookRisicoInfoLayer, cbsBuurtProjectEhvAirportLayer,
		ndwTrafficFlowLayer, ndwTrafficSpeedLayer, ndwTrafficSpeedLayerTest, aardbevingenLocationsLayer
		  // , heatmapTrafficFlowLayer
		   //, heatmapTrafficSpeedLayer,
		,nslSegmentEindhovenWMSLayer, nslResultEindhovenWMSLayer, nslReceptorEindhovenWMSLayer, nslMeasureEindhovenWMSLayer, dankPm10InvangWMSLayer, dankWandelWMSLayer, dankFietsWMSLayer, dankLandBelevingWMSLayer, dankBodemMaatregelCTotaalWMSLayer, dankBomenWMSLayer, dankBiomassaHoutvoorraadWMSLayer, dankBoomHoogteWMSLayer, dankBiomassaTakTopSnoeiWMSLayer,dankWarmteDalingWMSLayer,
		ovStopsWMSLayer, ovShapesWMSLayer, droneNoFlyZoneLandingsiteLayer,droneNoFlyZoneLuchtvaartLayer,AANLayer,
	 //aireasWMSPuntMetingenLayer,
	 aireasMeetkastenLayer, aireasGridGemStatisticsLayer, aireasGridGemStatisticsAvgLayer,
	 nslMeasuresInfoLayer, nslResultInfoLayer, nslResultSpmiAvgInfoLayer,
	 gtfsStopsInRangeInfoLayer,
	 PDOK_BAG_verblijfsobject_Layer, nsStationsLayer, Ahn1_5m_Layer, EHV_OplaadPalen_Layer, EHV_BeeldBepalendGroen_Layer, EHV_Bomen_Layer, EHV_Luchtkwaliteit_Layer, EHV_FaunaPoelen_Layer,
	 	EHV_Landschap_Layer, EHV_StedebouwkundigGebied_Layer, EHV_Wegenstructuur_Layer, EHV_Vergunningen_Layer, EHV_Lichtmasten_Layer,
		RTD_Spelen_Layer, RTD_SpeelPlaatsen_Layer, RTD_BROnderhoud_Layer, RTD_Bomen_Layer, RTD_BouwPlaatsen_Layer, RTD_Verkeersborden_Layer, RTD_StrNaamBorden_Layer, RTD_Plantsoenen_Layer, RTD_Lichtmasten_Layer,
		ARH_Bossen_Layer, ARH_Tuinen_Layer, ARH_Parken_Layer, ARH_BomenWVControle_Layer, ARH_BomenWVBeschermd_Layer, ARH_BomenWV_Layer, ARH_Restgroen_Layer, ARH_KlimaatZones_Layer, ARH_KlimaatZonesL_Layer, ARH_KlimaatZonesP_Layer, ARH_AfvalKunststof_Layer, 	ARH_AfvalGlas_Layer, ARH_AfvalRestafval_Layer, ARH_AfvalPapier_Layer, ARH_AfvalTextiel_Layer,
		KNMI_Layer, EnkelbestemmingLayer, DubbelbestemmingLayer, BestemmingsplangebiedLayer, BouwvlakLayer,
		GebiedsaanduidingLayer, Structuurvisieplangebied_G_Layer, nwbWegHectoPuntenLayer, nwbWegVakkenLayer;

	 var gtfsOms;


	// A drop-down menu for selecting a state; uses the "menu" namespace.
	var initDropDownGemeente = function(options) {
		var _city;

		var container 						= document.getElementsByClassName('leaflet-bottom leaflet-left')[0];
		dropDownGemeenteContainer 			= document.createElement('div');
		dropDownGemeenteContainer.id 		= APRI.UTIL.apriGuid(dropDownGemeenteContainer.id );
		dropDownGemeenteContainer.className = dropDownGemeenteContainer.className + " leaflet-control gemeente-selector";
		container.appendChild(dropDownGemeenteContainer);

		// set default
		if (areas[currentArea].deepLinkVars.city == undefined) {
			areas[currentArea].deepLinkVars.city = 'Eindhoven';
			//var _city = "Eindhoven";
			//var _urlGemeente = urlVars['gemeente'];
			//if (_urlGemeente != undefined) {
			//	_city = _urlGemeente;
			//} else  {
			//	window.history.pushState({city:_city}, "city", "?"+"city=" + _city);
			//}
		}

		currentAreaCity = areas[currentArea].deepLinkVars.city;
		if (cityArea[currentAreaCity] && cityArea[currentAreaCity].cityAreaCode) {
			currentAreaCode = cityArea[currentAreaCity].cityAreaCode; //
		} else currentAreaCode = '';

		dropDownGemeenteDispatchers = d3.dispatch("load", "statechange");

		dropDownGemeenteDispatchers.on("load.menu", function(gemeenten) {
  			gemeenteSelected = d3.select("#"+dropDownGemeenteContainer.id)
    			.append("div")
    			.append("select")
      			.on("change", function() {
					dropDownGemeenteDispatchers.statechange(gemeenten.get(this.value));
				});
			gemeenteSelected.selectAll("option")
      			.data(gemeenten.values())
    			.enter().append("option")
      			.attr("value", function(d) {
					return d.name;
					})
      			.text(function(d) { return d.name; });
			dropDownGemeenteDispatchers.on("statechange.menu", function(city) {
				var _cityTmp = city.name;
				areas[currentArea].deepLinkVars.city = _cityTmp;
				setPushState();
//				window.history.pushState({city:_cityTmp}, "city", "?"+"city=" + _cityTmp);
    			gemeenteSelected.property("value", _cityTmp);
				currentAreaCity = areas[currentArea].deepLinkVars.city;
				if (cityArea[currentAreaCity] && cityArea[currentAreaCity].cityAreaCode ) {
					currentAreaCode = cityArea[currentAreaCity].cityAreaCode;
				} else currentAreaCode = '';

				//todo: activate layer

				//initCbsGridGemLayer(_cityTmp);
				//cbsGridGemLayer.addTo(map);
  			});
		});



		dropDownGemeenteDispatchers.load(gemeenten);
  		dropDownGemeenteDispatchers.statechange(
			gemeenten.get(areas[currentArea].deepLinkVars.city)
		);
	};




	var initMapAddRemoveLayersEvent = function() {

		map.on('geojson', function(e) {
			//alert('geojson add layer');
		});


		map.on('viewreset', function(e) {
			//console.log('testviewreset');
			var zoomLevel = this.getZoom();
			if (appConfig.viewZoomLevel != zoomLevel ) {
				appConfig.viewZoomLevel = zoomLevel;
				apriCookieBase.setCookie('viewZoomLevel', appConfig.viewZoomLevel, 31);  //expdays
			}
			var mapCenter = this.getCenter();
			if (appConfig.mapCenterLat != mapCenter.lat && appConfig.mapCenterLng != mapCenter.lng ) {
				appConfig.mapCenterLat = mapCenter.lat;
				apriCookieBase.setCookie('mapCenterLat', appConfig.mapCenterLat, 31);  //expdays
				appConfig.mapCenterLng = mapCenter.lng;
				apriCookieBase.setCookie('mapCenterLng', appConfig.mapCenterLng, 31);  //expdays
			}

		});

		map.on('layeradd',
			function (e) {
				var name = null;
				var _options = e.layer.options;


				if (e.layer.options) {
					name = e.layer.options.name;

					if (e.layer.options.layerType) {
						var _pushState = true;
						areas[currentArea].deepLinkVars.layers = areas[currentArea].deepLinkVars.layers||[];
						for (var i=0;i<areas[currentArea].deepLinkVars.layers.length;i++) {
							if (areas[currentArea].deepLinkVars.layers[i].toString() == e.layer.options.layerType.toString()) {
								_pushState = false;
								break;
							}
						}
						if (_pushState == true) {
							areas[currentArea].deepLinkVars.layers.push(e.layer.options.layerType);
							setPushState();
						}
					}






					if (e.layer.options.layerType == 'projectAirportLayer' ) {

						// init data only once or when refreshData == true
						if (e.layer.options.refreshData == true) {
						}
						e.layer.options.refreshData=false;
//						retrievedDateMax = new Date();
//						var _date = retrievedDateMax.toISOString();

						if (e.layer.layerControl == null) {
							e.layer.layerControl = [
//								initTimeSliderCtrl({
//									layer:		e.layer,
//									container:	mapPanes.controlerPane,
//									label:		"Timeline" //aireasAvgType + " Timeline"
//								  })
//								,
								initTimeLineCtrl({
									container: 	mapPanes.controlerPane,
									width:		900,
									height:		280,
									//label: 		aireasDomainsRanges[aireasAvgType].legendLabel + ' - Legenda',
									label: 		'Project Eindhoven Airport, sensor locations and time schedule from 4 june until 20 july 2016',
									domain: 	aireasDomainsRanges[aireasAvgType].domain,
									range: 		aireasDomainsRanges[aireasAvgType].range,
									scale: 		aireasDomainsRanges[aireasAvgType].scale,
									data: 		e.layer.options.data,
									map:		map
								})
							];
							// timeSliderCtrl
//							document.addEventListener('tickEvent', function (e) {
//								playSliderMovie(e.detail.layer, e.detail.sliderDate, _options.avgType);
//							}, false);
							e.layer.layerControl[0].initControl();
//							e.layer.layerControl[1].initControl();
						} else {
							if (e.layer.layerControl) {
								if ( Object.prototype.toString.call( e.layer.layerControl ) === '[object Array]' ) {
									for (var i=0;i<e.layer.layerControl.length;i++) {
										e.layer.layerControl[i].show();
									}
								} else {
									e.layer.layerControl.show();
								}
							}

						}

//						loadDataAireasGridGemLayer(e.layer, {retrievedDateMax:_date, avgType: e.layer.options.avgType}); //'2014-12-10T23:50:05.376Z'); toISOString
					}


/*
					if (e.layer.options.layerType == 'heatmapTrafficFlowLayer' && e.layer.options.refreshData == true) {
						if (movieLayers[e.layer.options.layerType] == undefined) {
							movieLayers[e.layer.options.layerType] = {layer:e.layer };
						}
						e.layer.options.refreshData=false;
						//var _date = new Date().toISOString();
						var options = {};
						options.retrievedDateMax = new Date().toISOString();

						e.layer.options.loadDataTrafficFlowLayer(e.layer, options);
					}
*/

					if (e.layer.options.layerType == 'heatmapTrafficFlowLayer' && e.layer.layerControl) {
						if ( Object.prototype.toString.call( e.layer.layerControl ) === '[object Array]' ) {
							e.layer.layerControl[0].show();
						//	e.layer.layerControl[1].show();
						} else {
							e.layer.layerControl.show();
						}
					}
					if (e.layer.options.layerType == 'heatmapTrafficFlowLayer' && e.layer.options.refreshData == true) {
						e.layer.options.refreshData=false;
						e.layer.options.properties.retrievedDateMax = new Date();
						var _date = e.layer.options.properties.retrievedDateMax.toISOString();
						var _layer = e.layer;

						if (e.layer.layerControl == null) {
							var _ctrl1 = new ApriLeafLetCtrlTimeSlider({
									layer:		_layer,
									container:	mapPanes.controlerPane,
									label:		"Timeline " + e.layer.options.name
								  });
							/*
							initTimeSliderCtrl({
									layer:		e.layer,
									container:	mapPanes.controlerPane,
									label:		"Timeline " + e.layer.options.properties.avgType //aireasAvgType + " Timeline"
								  });
							*/
/*							var _ctrl2 = initLegendCtrl({
									container: 	mapPanes.controlerPane,
									label: 		aireasDomainsRanges[e.layer.options.properties.avgType].legendLabel + ' - Legenda',
									domain: 	aireasDomainsRanges[e.layer.options.properties.avgType].domain,
									range: 		aireasDomainsRanges[e.layer.options.properties.avgType].range,
									scale: 		aireasDomainsRanges[e.layer.options.properties.avgType].scale
								})
*/
							e.layer.layerControl = [ _ctrl1];

//								,
/*
								, initLegendCtrl({
									container: 	mapPanes.controlerPane,
									label: 		aireasAvgType + ' - Legenda - TEST',
									test: 		true,
									domain: 	aireasDomainsRanges[aireasAvgType].domain,
									range: 		aireasDomainsRanges[aireasAvgType].range,
									scale: 		aireasDomainsRanges[aireasAvgType].scale
								})
*/
//							];
							// timeSliderCtrl

							if (e.layer.layerControl[0]) e.layer.layerControl[0].controlElement = e.layer.layerControl[0].initControl();
							//if (e.layer.layerControl[1]) e.layer.layerControl[1].controlElement = e.layer.layerControl[1].initControl();
							if (tickEventActive == false) {
								document.addEventListener('tickEvent', function (e ) {
									playSliderMovie(e.detail.layer, e.detail.sliderDate, _options.properties.name);
								}, false);
								tickEventActive = true;
							}
						} else {
							if (e.layer.layerControl) {
								if ( Object.prototype.toString.call( e.layer.layerControl ) === '[object Array]' ) {
									for (var i=0;i<e.layer.layerControl.length;i++) {
										e.layer.layerControl[i].show();
									}
								} else {
									e.layer.layerControl.show();
								}
							}

						}
						e.layer.options.properties.retrievedDateMax = _date;

						if (e.layer != undefined) {

						}
						e.layer.options.loadData(e.layer, e.layer.options); //'2014-12-10T23:50:05.376Z'); toISOString
//						loadDataAireasGridGemLayer(e.layer, {retrievedDateMax:_date, avgType: e.layer.options.avgType}); //'2014-12-10T23:50:05.376Z'); toISOString
					}


					if (e.layer.options.layerType == 'aireasGridGemLayer' && e.layer.layerControl) {
						if ( Object.prototype.toString.call( e.layer.layerControl ) === '[object Array]' ) {
							e.layer.layerControl[0].show();
							e.layer.layerControl[1].show();
						} else {
							e.layer.layerControl.show();
						}
					}

					if (e.layer.options.layerType == 'aireasGridGemLayer' && e.layer.options.refreshData == true) {
						e.layer.options.refreshData=false;
						e.layer.options.properties.retrievedDateMax = new Date();
						var _date = e.layer.options.properties.retrievedDateMax.toISOString();
						var _layer = e.layer;

						if (e.layer.layerControl == null) {
							var _ctrl1 = new ApriLeafLetCtrlTimeSlider({
									layer:		_layer,
									container:	mapPanes.controlerPane,
									label:		"Timeline " + e.layer.options.properties.avgType //aireasAvgType + " Timeline"
								  });
							/*
							initTimeSliderCtrl({
									layer:		e.layer,
									container:	mapPanes.controlerPane,
									label:		"Timeline " + e.layer.options.properties.avgType //aireasAvgType + " Timeline"
								  });
							*/
							var _ctrl2 = initLegendCtrl({
									container: 	mapPanes.controlerPane,
									label: 		aireasDomainsRanges[e.layer.options.properties.avgType].legendLabel + ' - Legenda',
									domain: 	aireasDomainsRanges[e.layer.options.properties.avgType].domain,
									range: 		aireasDomainsRanges[e.layer.options.properties.avgType].range,
									scale: 		aireasDomainsRanges[e.layer.options.properties.avgType].scale
								})
							e.layer.layerControl = [ _ctrl1, _ctrl2];

//								,
/*
								, initLegendCtrl({
									container: 	mapPanes.controlerPane,
									label: 		aireasAvgType + ' - Legenda - TEST',
									test: 		true,
									domain: 	aireasDomainsRanges[aireasAvgType].domain,
									range: 		aireasDomainsRanges[aireasAvgType].range,
									scale: 		aireasDomainsRanges[aireasAvgType].scale
								})
*/
//							];
							// timeSliderCtrl

							if (e.layer.layerControl[0]) e.layer.layerControl[0].controlElement = e.layer.layerControl[0].initControl();
							if (e.layer.layerControl[1]) e.layer.layerControl[1].controlElement = e.layer.layerControl[1].initControl();
							if (tickEventActive == false) {
								document.addEventListener('tickEvent', function (e ) {
									playSliderMovie(e.detail.layer, e.detail.sliderDate, _options.properties.avgType);
								}, false);
								tickEventActive = true;
							}
						} else {
							if (e.layer.layerControl) {
								if ( Object.prototype.toString.call( e.layer.layerControl ) === '[object Array]' ) {
									for (var i=0;i<e.layer.layerControl.length;i++) {
										e.layer.layerControl[i].show();
									}
								} else {
									e.layer.layerControl.show();
								}
							}

						}
						e.layer.options.properties.retrievedDateMax = _date;
						e.layer.options.loadData(e.layer, e.layer.options); //'2014-12-10T23:50:05.376Z'); toISOString
//						loadDataAireasGridGemLayer(e.layer, {retrievedDateMax:_date, avgType: e.layer.options.avgType}); //'2014-12-10T23:50:05.376Z'); toISOString
					}

					if (e.layer.options.layerType == 'aireasHistGridGemLayer' && e.layer.options.refreshData == true) {
						e.layer.options.refreshData=false;
						retrievedDateMax = new Date();
						var _date = retrievedDateMax.toISOString();

						if (e.layer.layerControl == null) {
							e.layer.layerControl = [
								initTimeSliderCtrl({
									layer:		e.layer,
									container:	mapPanes.controlerPane,
									label:		aireasAvgType + " Timeline"
								  })
								, initLegendCtrl({
									container: 	mapPanes.controlerPane,
									label: 		aireasDomainsRanges[aireasAvgType].legendLabel + ' - Legenda',
									domain: 	aireasDomainsRanges[aireasAvgType].domain,
									range: 		aireasDomainsRanges[aireasAvgType].range,
									scale: 		aireasDomainsRanges[aireasAvgType].scale
								})
/*
								, initLegendCtrl({
									container: 	mapPanes.controlerPane,
									label: 		aireasAvgType + ' - Legenda - TEST',
									test: 		true,
									domain: 	aireasDomainsRanges[aireasAvgType].domain,
									range: 		aireasDomainsRanges[aireasAvgType].range,
									scale: 		aireasDomainsRanges[aireasAvgType].scale
								})
*/
							];
							// timeSliderCtrl
							document.addEventListener('tickEvent', function (e) {
								playSliderMovie(e.detail.layer, e.detail.sliderDate, _options.avgType);
							}, false);
							if (e.layer.layerControl[0]) e.layer.layerControl[0].controlElement = e.layer.layerControl[0].initControl();
							if (e.layer.layerControl[1]) e.layer.layerControl[1].controlElement = e.layer.layerControl[1].initControl();
						} else {
							if (e.layer.layerControl) {
								if ( Object.prototype.toString.call( e.layer.layerControl ) === '[object Array]' ) {
									for (var i=0;i<e.layer.layerControl.length;i++) {
										e.layer.layerControl[i].show();
									}
								} else {
									e.layer.layerControl.show();
								}
							}

						}

						loadDataAireasHistGridGemLayer(e.layer, {hist_year: 2014, hist_month:null, hist_day:null, avgType: e.layer.options.avgType}); //'2014-12-10T23:50:05.376Z'); toISOString
					}



					if (e.layer.options.legendPng) {
						if (e.layer.layerControl == null) {
							e.layer.layerControl = initLayerCtrl({type: "legendPgn", url: e.layer.options.legendPng} );
						}
					}

					if (e.layer.options.zoomTo) {
						map.setZoom(e.layer.options.zoomTo);
					}


					if (e.layer.options.layerType == 'aireasGridGemStatisticsLayer' && e.layer.options.refreshData == true) {
						initDomainsRangesScales();
						e.layer.options.refreshData=false;
						loadDataAireasGridGemStatisticsLayer({});
					}
					if (e.layer.options.layerType == 'aireasGridGemStatisticsAvgLayer' && e.layer.options.refreshData == true) {
						initDomainsRangesScales();
						e.layer.options.refreshData=false;
						loadDataAireasGridGemStatisticsAvgLayer({});
					}
					if (e.layer.options.layerType == 'cbsGridGemLayer' && e.layer.options.refreshData == true) {
						e.layer.options.refreshData=false;
						e.layer.options.loadData(e.layer,{areaCity:currentAreaCity});
					}
					if (e.layer.options.layerType == 'waterschapGrenzenLayer' && e.layer.options.refreshData == true) {
						e.layer.options.refreshData=false;
						e.layer.options.loadData(e.layer,{});
					}

					if (e.layer.options.layerType == 'aireasMeetkastenLayer' && e.layer.options.refreshData == true) {
						e.layer.options.refreshData=false;
						e.layer.options.loadData(e.layer,{areaCity:currentAreaCity});
					}
					if (e.layer.options.layerType == 'bijenGifLayer' && e.layer.options.refreshData == true) {
						e.layer.options.refreshData=false;
						e.layer.options.loadData(e.layer,{});
					}
					if (e.layer.options.layerType == 'pestInfoStofKentallen' && e.layer.options.refreshData == true) {
						e.layer.options.refreshData=false;
						e.layer.options.loadData(e.layer,{});
					}


					if (e.layer.options.layerType == 'luftDatenEurSmallLayer' && e.layer.layerControl) {
						if ( Object.prototype.toString.call( e.layer.layerControl ) === '[object Array]' ) {
							e.layer.layerControl[0].show();
							e.layer.layerControl[1].show();
						} else {
							e.layer.layerControl.show();
						}
					}

					if (e.layer.options.layerType == 'luftDatenEurSmallLayer' && e.layer.options.refreshData == true) {
						e.layer.options.refreshData=false;
						e.layer.options.properties.retrievedDateMax = new Date();
						var _date = e.layer.options.properties.retrievedDateMax.toISOString();
						var _layer = e.layer;

						if (e.layer.layerControl == null) {
							var _ctrl1 = new ApriLeafLetCtrlTimeSlider({
									layer:		_layer,
									container:	mapPanes.controlerPane,
									label:		"Timeline " + e.layer.options.properties.avgType
								  });
							/*
							initTimeSliderCtrl({
									layer:		e.layer,
									container:	mapPanes.controlerPane,
									label:		"Timeline " + e.layer.options.properties.avgType
								  });
							*/
							var _ctrl2 = initLegendCtrl({
									container: 	mapPanes.controlerPane,
									label: 		aireasDomainsRanges[e.layer.options.properties.avgType].legendLabel + ' - Legenda',
									domain: 	aireasDomainsRanges[e.layer.options.properties.avgType].domain,
									range: 		aireasDomainsRanges[e.layer.options.properties.avgType].range,
									scale: 		aireasDomainsRanges[e.layer.options.properties.avgType].scale
								})
							e.layer.layerControl = [ _ctrl1, _ctrl2];

//								,
/*
								, initLegendCtrl({
									container: 	mapPanes.controlerPane,
									label: 		aireasAvgType + ' - Legenda - TEST',
									test: 		true,
									domain: 	aireasDomainsRanges[aireasAvgType].domain,
									range: 		aireasDomainsRanges[aireasAvgType].range,
									scale: 		aireasDomainsRanges[aireasAvgType].scale
								})
*/
//							];
							// timeSliderCtrl

							if (e.layer.layerControl[0]) e.layer.layerControl[0].controlElement = e.layer.layerControl[0].initControl();
							if (e.layer.layerControl[1]) e.layer.layerControl[1].controlElement = e.layer.layerControl[1].initControl();
							if (tickEventActive == false) {
								document.addEventListener('tickEvent', function (e ) {
									var _sliderDate = new Date(e.detail.sliderDate.getTime() - _options.properties.timeSpan );
									playSliderMovie(e.detail.layer, _sliderDate, _options.properties.avgType);
								}, false);
								tickEventActive = true;
							}
						} else {
							if (e.layer.layerControl) {
								if ( Object.prototype.toString.call( e.layer.layerControl ) === '[object Array]' ) {
									for (var i=0;i<e.layer.layerControl.length;i++) {
										e.layer.layerControl[i].show();
									}
								} else {
									e.layer.layerControl.show();
								}
							}

						}
						e.layer.options.properties.retrievedDateMax = _date;
						e.layer.options.loadData(e.layer, e.layer.options); //'2014-12-10T23:50:05.376Z'); toISOString
					}


					if (e.layer.options.layerType == 'luftDatenStuttgartLayer' && e.layer.layerControl) {
						if ( Object.prototype.toString.call( e.layer.layerControl ) === '[object Array]' ) {
							e.layer.layerControl[0].show();
							e.layer.layerControl[1].show();
						} else {
							e.layer.layerControl.show();
						}
					}

					if (e.layer.options.layerType == 'luftDatenStuttgartLayer' && e.layer.options.refreshData == true) {
						e.layer.options.refreshData=false;
						e.layer.options.properties.retrievedDateMax = new Date();
						var _date = e.layer.options.properties.retrievedDateMax.toISOString();
						var _layer = e.layer;

						if (e.layer.layerControl == null) {
							var _ctrl1 = new ApriLeafLetCtrlTimeSlider({
									layer:		_layer,
									container:	mapPanes.controlerPane,
									label:		"Timeline " + e.layer.options.properties.avgType
								  });
							var _ctrl2 = initLegendCtrl({
									container: 	mapPanes.controlerPane,
									label: 		aireasDomainsRanges[e.layer.options.properties.avgType].legendLabel + ' - Legenda',
									domain: 	aireasDomainsRanges[e.layer.options.properties.avgType].domain,
									range: 		aireasDomainsRanges[e.layer.options.properties.avgType].range,
									scale: 		aireasDomainsRanges[e.layer.options.properties.avgType].scale
								})
							e.layer.layerControl = [ _ctrl1, _ctrl2];

							if (e.layer.layerControl[0]) e.layer.layerControl[0].controlElement = e.layer.layerControl[0].initControl();
							if (e.layer.layerControl[1]) e.layer.layerControl[1].controlElement = e.layer.layerControl[1].initControl();
							if (tickEventActive == false) {
								document.addEventListener('tickEvent', function (e ) {
									var _sliderDate = new Date(e.detail.sliderDate.getTime() - _options.properties.timeSpan );
									playSliderMovie(e.detail.layer, _sliderDate, _options.properties.avgType);
								}, false);
								tickEventActive = true;
							}
						} else {
							if (e.layer.layerControl) {
								if ( Object.prototype.toString.call( e.layer.layerControl ) === '[object Array]' ) {
									for (var i=0;i<e.layer.layerControl.length;i++) {
										e.layer.layerControl[i].show();
									}
								} else {
									e.layer.layerControl.show();
								}
							}

						}
						e.layer.options.properties.retrievedDateMax = _date;
						e.layer.options.loadData(e.layer, e.layer.options); //'2014-12-10T23:50:05.376Z'); toISOString
					}

					if (e.layer.options.layerType == 'luftDatenSofiaLayer' && e.layer.layerControl) {
						if ( Object.prototype.toString.call( e.layer.layerControl ) === '[object Array]' ) {
							e.layer.layerControl[0].show();
							e.layer.layerControl[1].show();
						} else {
							e.layer.layerControl.show();
						}
					}

					if (e.layer.options.layerType == 'luftDatenSofiaLayer' && e.layer.options.refreshData == true) {
						e.layer.options.refreshData=false;
						e.layer.options.properties.retrievedDateMax = new Date();
						var _date = e.layer.options.properties.retrievedDateMax.toISOString();
						var _layer = e.layer;

						if (e.layer.layerControl == null) {
							var _ctrl1 = new ApriLeafLetCtrlTimeSlider({
									layer:		_layer,
									container:	mapPanes.controlerPane,
									label:		"Timeline " + e.layer.options.properties.avgType
								  });
							/*
							initTimeSliderCtrl({
									layer:		e.layer,
									container:	mapPanes.controlerPane,
									label:		"Timeline " + e.layer.options.properties.avgType
								  });
							*/
							var _ctrl2 = initLegendCtrl({
									container: 	mapPanes.controlerPane,
									label: 		aireasDomainsRanges[e.layer.options.properties.avgType].legendLabel + ' - Legenda',
									domain: 	aireasDomainsRanges[e.layer.options.properties.avgType].domain,
									range: 		aireasDomainsRanges[e.layer.options.properties.avgType].range,
									scale: 		aireasDomainsRanges[e.layer.options.properties.avgType].scale
								})
							e.layer.layerControl = [ _ctrl1, _ctrl2];

							if (e.layer.layerControl[0]) e.layer.layerControl[0].controlElement = e.layer.layerControl[0].initControl();
							if (e.layer.layerControl[1]) e.layer.layerControl[1].controlElement = e.layer.layerControl[1].initControl();
							if (tickEventActive == false) {
								document.addEventListener('tickEvent', function (e ) {
									var _sliderDate = new Date(e.detail.sliderDate.getTime() - _options.properties.timeSpan );
									playSliderMovie(e.detail.layer, _sliderDate, _options.properties.avgType);
								}, false);
								tickEventActive = true;
							}
						} else {
							if (e.layer.layerControl) {
								if ( Object.prototype.toString.call( e.layer.layerControl ) === '[object Array]' ) {
									for (var i=0;i<e.layer.layerControl.length;i++) {
										e.layer.layerControl[i].show();
									}
								} else {
									e.layer.layerControl.show();
								}
							}

						}
						e.layer.options.properties.retrievedDateMax = _date;
						e.layer.options.loadData(e.layer, e.layer.options); //'2014-12-10T23:50:05.376Z'); toISOString
					}

					if (e.layer.options.layerType == 'luftDatenAntwerpenLayer' && e.layer.layerControl) {
						if ( Object.prototype.toString.call( e.layer.layerControl ) === '[object Array]' ) {
							e.layer.layerControl[0].show();
							e.layer.layerControl[1].show();
						} else {
							e.layer.layerControl.show();
						}
					}

					if (e.layer.options.layerType == 'luftDatenAntwerpenLayer' && e.layer.options.refreshData == true) {
						e.layer.options.refreshData=false;
						e.layer.options.properties.retrievedDateMax = new Date();
						var _date = e.layer.options.properties.retrievedDateMax.toISOString();
						var _layer = e.layer;

						if (e.layer.layerControl == null) {
							var _ctrl1 = new ApriLeafLetCtrlTimeSlider({
									layer:		_layer,
									container:	mapPanes.controlerPane,
									label:		"Timeline " + e.layer.options.properties.avgType
								  });
							/*
							initTimeSliderCtrl({
									layer:		e.layer,
									container:	mapPanes.controlerPane,
									label:		"Timeline " + e.layer.options.properties.avgType
								  });
							*/
							var _ctrl2 = initLegendCtrl({
									container: 	mapPanes.controlerPane,
									label: 		aireasDomainsRanges[e.layer.options.properties.avgType].legendLabel + ' - Legenda',
									domain: 	aireasDomainsRanges[e.layer.options.properties.avgType].domain,
									range: 		aireasDomainsRanges[e.layer.options.properties.avgType].range,
									scale: 		aireasDomainsRanges[e.layer.options.properties.avgType].scale
								})
							e.layer.layerControl = [ _ctrl1, _ctrl2];

							if (e.layer.layerControl[0]) e.layer.layerControl[0].controlElement = e.layer.layerControl[0].initControl();
							if (e.layer.layerControl[1]) e.layer.layerControl[1].controlElement = e.layer.layerControl[1].initControl();
							if (tickEventActive == false) {
								document.addEventListener('tickEvent', function (e ) {
									var _sliderDate = new Date(e.detail.sliderDate.getTime() - _options.properties.timeSpan );
									playSliderMovie(e.detail.layer, _sliderDate, _options.properties.avgType);
								}, false);
								tickEventActive = true;
							}
						} else {
							if (e.layer.layerControl) {
								if ( Object.prototype.toString.call( e.layer.layerControl ) === '[object Array]' ) {
									for (var i=0;i<e.layer.layerControl.length;i++) {
										e.layer.layerControl[i].show();
									}
								} else {
									e.layer.layerControl.show();
								}
							}

						}
						e.layer.options.properties.retrievedDateMax = _date;
						e.layer.options.loadData(e.layer, e.layer.options); //'2014-12-10T23:50:05.376Z'); toISOString
					}
   // einde Antwerpen

   if (e.layer.options.layerType == 'luftDatenLeuvenLayer' && e.layer.layerControl) {
     if ( Object.prototype.toString.call( e.layer.layerControl ) === '[object Array]' ) {
       e.layer.layerControl[0].show();
       e.layer.layerControl[1].show();
     } else {
       e.layer.layerControl.show();
     }
   }

   if (e.layer.options.layerType == 'luftDatenLeuvenLayer' && e.layer.options.refreshData == true) {
     e.layer.options.refreshData=false;
     e.layer.options.properties.retrievedDateMax = new Date();
     var _date = e.layer.options.properties.retrievedDateMax.toISOString();
     var _layer = e.layer;

     if (e.layer.layerControl == null) {
       var _ctrl1 = new ApriLeafLetCtrlTimeSlider({
           layer:		_layer,
           container:	mapPanes.controlerPane,
           label:		"Timeline " + e.layer.options.properties.avgType
           });
       /*
       initTimeSliderCtrl({
           layer:		e.layer,
           container:	mapPanes.controlerPane,
           label:		"Timeline " + e.layer.options.properties.avgType
           });
       */
       var _ctrl2 = initLegendCtrl({
           container: 	mapPanes.controlerPane,
           label: 		aireasDomainsRanges[e.layer.options.properties.avgType].legendLabel + ' - Legenda',
           domain: 	aireasDomainsRanges[e.layer.options.properties.avgType].domain,
           range: 		aireasDomainsRanges[e.layer.options.properties.avgType].range,
           scale: 		aireasDomainsRanges[e.layer.options.properties.avgType].scale
         })
       e.layer.layerControl = [ _ctrl1, _ctrl2];

       if (e.layer.layerControl[0]) e.layer.layerControl[0].controlElement = e.layer.layerControl[0].initControl();
       if (e.layer.layerControl[1]) e.layer.layerControl[1].controlElement = e.layer.layerControl[1].initControl();
       if (tickEventActive == false) {
         document.addEventListener('tickEvent', function (e ) {
           var _sliderDate = new Date(e.detail.sliderDate.getTime() - _options.properties.timeSpan );
           playSliderMovie(e.detail.layer, _sliderDate, _options.properties.avgType);
         }, false);
         tickEventActive = true;
       }
     } else {
       if (e.layer.layerControl) {
         if ( Object.prototype.toString.call( e.layer.layerControl ) === '[object Array]' ) {
           for (var i=0;i<e.layer.layerControl.length;i++) {
             e.layer.layerControl[i].show();
           }
         } else {
           e.layer.layerControl.show();
         }
       }

     }
     e.layer.options.properties.retrievedDateMax = _date;
     e.layer.options.loadData(e.layer, e.layer.options); //'2014-12-10T23:50:05.376Z'); toISOString
   }
// einde Leuven





		//			if (name == 'aireasWMSPuntMetingenLayer') {
		//				e.layer.bringToFront();
		//				e.layer.setOpacity( 0.5 )
		//			}



				}
			}
		);
		map.on('overlayadd',
			function (e) {
				var name = e.layer.options.name;
				var _options = e.layer.options;


				if (e.layer.options.loadLianderData) {
					loadDataLianderOnce(e.layer.options.loadLianderData);
				}
				if (e.layer.options.layerType == 'aardbevingenLocationsLayer' && e.layer.options.refreshData == true) {
					e.layer.options.refreshData=false;
					e.layer.options.loadDataOnce();
				}
				if (e.layer.options.layerType == 'powerPlantsLayer' && e.layer.options.refreshData == true) {
					e.layer.options.refreshData=false;
					e.layer.options.loadDataOnce();
				}
				if (e.layer.options.layerType == 'nsStationsLayer' && e.layer.options.refreshData == true) {
					e.layer.options.refreshData=false;
					e.layer.options.loadDataOnce();
				}
				if (e.layer.options.layerType == 'aireasMeetkastenLayer' && e.layer.options.refreshData == true) {
					e.layer.options.refreshData=false;
					e.layer.options.loadData(e.layer,{areaCity:currentAreaCity});
				}
				if (e.layer.options.layerType == 'bijenGifLayer' && e.layer.options.refreshData == true) {
					e.layer.options.refreshData=false;
					e.layer.options.loadData(e.layer,{});
				}
				if (e.layer.options.layerType == 'pestInfoStofKentallen' && e.layer.options.refreshData == true) {
					e.layer.options.refreshData=false;
					e.layer.options.loadData(e.layer,{});
				}
				if (e.layer.options.layerType == 'cbsBuurtInfoLayer' && e.layer.options.refreshData == true) {
					e.layer.options.refreshData=false;
					e.layer.options.loadDataOnce();
				}
				if (e.layer.options.layerType == 'cbsBuurtRookRisicoInfoLayer' && e.layer.options.refreshData == true) {
					e.layer.options.refreshData=false;
					e.layer.options.loadDataOnce();
				}
				if (e.layer.options.layerType == 'cbsBuurtProjectEhvAirportLayer' && e.layer.options.refreshData == true) {
					e.layer.options.refreshData=false;
					e.layer.options.loadDataOnce();
				}
				if (e.layer.options.layerType == 'ndwTrafficFlowLayer' && e.layer.options.refreshData == true) {
					e.layer.options.refreshData=false;
					e.layer.options.loadDataOnce();
				}
				if (e.layer.options.layerType == 'ndwTrafficSpeedLayer' && e.layer.options.refreshData == true) {
					e.layer.options.refreshData=false;
					e.layer.options.loadDataOnce();
				}
				if (e.layer.options.layerType == 'ndwTrafficSpeedLayerTest' && e.layer.options.refreshData == true) {
					e.layer.options.refreshData=false;
					e.layer.options.loadDataOnce();
				}

//				if (e.layer.options.loadTrafficData) {
//					e.layer.options.loadDataTrafficOnce(e.layer.options.loadTrafficData);
//				}


				if (e.layer.options.layerType == 'nslMeasuresInfoLayer' && e.layer.refreshData == true) {
					//if (e.target._layers=={} ) {
					e.layer.refreshData=false;
					if (e.layer.layerControl == null) {
						e.layer.layerControl = initLayerCtrl();
					}
					loadDataNslMeasuresInfoLayer({});
					//}
				}


				if (e.layer.options.layerType == 'nslResultInfoLayer' && e.layer.refreshData == true) {
					//if (e.target._layers=={} ) {
					e.layer.refreshData=false;
					if (e.layer.layerControl == null) {
						e.layer.layerControl = initLayerCtrl();
					}
					loadDataNslResultInfoLayer({});
					//}
				}

				if (e.layer.options.layerType == 'nslResultSpmiAvgInfoLayer' && e.layer.refreshData == true) {
					//if (e.target._layers=={} ) {
					e.layer.refreshData=false;
					initDomainsRangesScales();
					if (e.layer.layerControl == null) {
						e.layer.layerControl = initLayerCtrl();
					}
					loadDataNslResultSpmiAvgInfoLayer({});
					//}
				}

				if (e.layer.options.layerType == 'gtfsStopsInRangeInfoLayer' && e.layer.refreshData == true) {
					//if (e.target._layers=={} ) {
					e.layer.refreshData=false;
					if (e.layer.layerControl == null) {
						e.layer.layerControl = initLayerCtrl();

					}
					//gtfsOms.add(map
					loadDataGtfsStopsInRangeInfoLayer({});
					//}
				}

				if (e.layer.layerControl) {
					if ( Object.prototype.toString.call( e.layer.layerControl ) === '[object Array]' ) {
						if (e.layer.layerControl[0]) e.layer.layerControl[0].show();
						if (e.layer.layerControl[1]) e.layer.layerControl[1].show();
					} else {
						if (e.layer.layerControl) e.layer.layerControl.show();
					}
				}


			}
		);

		map.on('layerremove', function(e) {

			if (e.layer.options) {

				if (e.layer.options.layerType) {
					var _pushState = false;
					areas[currentArea].deepLinkVars.layers=areas[currentArea].deepLinkVars.layers||[];
					var newArray = [];
					for (var i=0;i<areas[currentArea].deepLinkVars.layers.length;i++) {
						if (areas[currentArea].deepLinkVars.layers[i].toString() == e.layer.options.layerType.toString()) {
							_pushState = true;
						} else {
							newArray.push(areas[currentArea].deepLinkVars.layers[i]);
						}
					}
					if (_pushState == true) {
						areas[currentArea].deepLinkVars.layers = newArray;
						setPushState();
					}
				}

				if (e.layer.options.layerType == 'nslMeasuresInfoLayer') {
					//e.layer.refreshData=true;
					// remove control ?? e.layer.layerControl = initLayerCtrl();
				}
				if (e.layer.options.layerType == 'nslResultInfoLayer') {
					//e.layer.refreshData=true;
					// remove control ?? e.layer.layerControl = initLayerCtrl();
				}
				if (e.layer.options.layerType == 'nslResultSpmiAvgInfoLayer') {
					//e.layer.refreshData=true;
					// remove control ?? e.layer.layerControl = initLayerCtrl();
				}
				if (e.layer.options.layerType == 'gtfsStopsInRangeInfoLayer') {
					//e.layer.refreshData=true;
					// remove control ?? e.layer.layerControl = initLayerCtrl();
				}
			}


			if (e.layer.layerControl) {
				if ( Object.prototype.toString.call( e.layer.layerControl ) === '[object Array]' ) {
					e.layer.layerControl[0].hide();
					e.layer.layerControl[1].hide();
				} else {
					e.layer.layerControl.hide();
				}
			}

		});

/* todo
		areas[currentArea].layers['aireasGridGemLayer'].layerObject = layerClasses['aireasGridGemLayer'].layerClass();
		map.addLayer(areas[currentArea].layers['aireasGridGemLayer'].layerObject);
		activateLayers(	areas[currentArea].deepLinkVars.layers);
*/

//		map.on('load', function(e) {
//			addLayersToMap();
//		})



 		for (var i=0;i<areas.length;i++) {
			var _tmp = areas[i].deepLinkVars;
			for (var key in _tmp) {
				if (key == 'city') {
					var _city = _tmp[key];
					if (cityArea[_city] && cityArea[_city].cityAreaCode) {
						//initArea(cityArea[_city].cityAreaCode, i);
						initAreaLayerPackagesList( cityArea[_city].cityAreaCode, areas[i] );

					}
				}

				if (key == 'layers') {
					var _layers = _tmp[key];
					for (var j=0;j<_layers.length;j++) {
						console.log('activate layer: ' + _layers[j]);
						var _layer = {};
						_layer.name = _layers[j];

						for (var keyLayer in areas[i].areaLayer) {
							if (_layers[j] == keyLayer) {
								activateLayer(areas[i].areaLayer[keyLayer].layer,i);
							}
						}
						//activateLayer(_layer, i);
					}
				}
				if (currentArea == -1) currentArea = i;
				//currentArea = i;
				//break;
			}
			if (currentArea != -1) break;
		}
		if (currentArea == -1) currentArea = 0;




	};




// ===============  heatmap  energieverbruik start


	var dataRetrievedElk = false;
	var dataRetrievedGas = false;

	function loadDataLianderOnce(typeOfProduct) {
		if (typeOfProduct == "ELK" && !dataRetrievedElk) {
			elkGasHeatMap(typeOfProduct);
			dataRetrievedElk = true;
		}
		if (typeOfProduct == "GAS" && !dataRetrievedGas) {
			elkGasHeatMap(typeOfProduct);
			dataRetrievedGas = true;
		}
	}


	var verbruikDataGAS = [];
	var heatmapGASLayer = L.heatLayer(verbruikDataGAS, {radius: 25, loadLianderData: "GAS"}); //, max:10, gradient: {0.4: 'blue', 0.65: 'lime', 1: 'red'}

	var verbruikDataGASDeltaLess20132014 = [];
	var heatmapGASDeltaLess20132014Layer = L.heatLayer(verbruikDataGASDeltaLess20132014, {radius: 25, loadLianderData: "GAS"}); //, max:10, gradient: {0.4: 'blue', 0.65: 'lime', 1: 'red'}
	var verbruikDataGASDeltaMore20132014 = [];
	var heatmapGASDeltaMore20132014Layer = L.heatLayer(verbruikDataGASDeltaMore20132014, {radius: 25, loadLianderData: "GAS"}); //, max:10, gradient: {0.4: 'blue', 0.65: 'lime', 1: 'red'}

	var verbruikDataELK = [];
	var heatmapELKLayer = L.heatLayer(verbruikDataELK, {radius: 25, loadLianderData: "ELK"}); //, max:10, gradient: {0.4: 'blue', 0.65: 'lime', 1: 'red'}
	var verbruikDataELKDeltaLess20132014 = [];
	var heatmapELKDeltaLess20132014Layer = L.heatLayer(verbruikDataELKDeltaLess20132014, {radius: 40, blur:20, max:1, gradient: {0.4: 'blue', 0.6: 'cyan', 0.7: 'lime', 0.8: 'yellow', 1: 'red'}, loadLianderData: "ELK"});
	var verbruikDataELKDeltaMore20132014 = [];
	var heatmapELKDeltaMore20132014Layer = L.heatLayer(verbruikDataELKDeltaMore20132014, {radius: 40, blur:20, max:1, gradient: {0.4: 'blue', 0.6: 'cyan', 0.7: 'lime', 0.8: 'yellow', 1: 'red'}, loadLianderData: "ELK"});
	var verbruikDataELKRichtingPrc20132014 = [];
	var heatmapELKRichtingPrc20132014Layer = L.heatLayer(verbruikDataELKRichtingPrc20132014, {radius: 40, blur:20, max:1, gradient: {0.4: 'blue', 0.6: 'cyan', 0.7: 'lime', 0.8: 'yellow', 1: 'red'}, loadLianderData: "ELK"});
	var verbruikDataELKDeltaRichtingPrc20132014 = [];
	var heatmapELKDeltaRichtingPrc20132014Layer = L.heatLayer(verbruikDataELKDeltaRichtingPrc20132014, {radius: 40, blur:20, max:1, gradient: {0.4: 'blue', 0.6: 'cyan', 0.7: 'lime', 0.8: 'yellow', 1: 'red'}, loadLianderData: "ELK"});


	function elkGasHeatMap(typeOfProduct) {

		ajaxCallHeatMap(typeOfProduct);

		function ajaxCallHeatMap (productSoort) {

			var xmlhttpHeatmap;
			xmlhttpHeatmap=new XMLHttpRequest();

			//var featureofinterest = 'liander';
			//var featureofinterest = 'enexis';
			//var featureofinterest = 'endinet';
			var featureofinterest = 'stedin';


//			var lianderVerbruikLayerUrl = APRI.getConfig().urlSystemRoot + "/liander/verbruik/" + productSoort + "/";
			var lianderVerbruikLayerUrl = 'http://localhost:4000/SCAPE604/openiod?SERVICE=WPS&REQUEST=Execute&identifier=observation_liander&featureofinterest=' + featureofinterest + '&year=2016&product=' + productSoort + '&format=json';

	//		http://localhost:4000/SCAPE604/openiod?SERVICE=WPS&REQUEST=Execute&identifier=observation_liander&featureofinterest=liander&year=2016&product=GAS&format=json


			xmlhttpHeatmap.onreadystatechange=function() {
		    	var i, _verbruikDataRecord, inpRecord;
  				if (xmlhttpHeatmap.readyState==4 && xmlhttpHeatmap.status==200) {
			    	var jsonResponse = JSON.parse(xmlhttpHeatmap.responseText);


					if (productSoort == "ELK" ) {
						// data for heatmap Liander verbruik
						for(i=0;i<jsonResponse.records.length;i++) {
							inpRecord = jsonResponse.records[i];
							_verbruikDataRecord = [];
							_verbruikDataRecord[0] = inpRecord.WGS84Lat;
							_verbruikDataRecord[1] = inpRecord.WGS84Lon;
							_verbruikDataRecord.alt = inpRecord.SJVTotaal*0.000002; //<1600?1600:inpRecord.SJV;
						//	_verbruikDataRecord.alt = inpRecord.SJV*0.0005; //<1600?1600:inpRecord.SJV;
							// inpRecordGas.aantalAanslDef
							verbruikDataELK.push(_verbruikDataRecord);
						}
						heatmapELKLayer.setLatLngs(verbruikDataELK);

						// data for heatmap Liander verbruik
						for(i=0;i<jsonResponse.records.length;i++) {
							inpRecord = jsonResponse.records[i];
							if (inpRecord.SJVDelta>=0) continue; //skip greater or equal zero values
							_verbruikDataRecord = [];
							_verbruikDataRecord[0] = inpRecord.WGS84Lat;
							_verbruikDataRecord[1] = inpRecord.WGS84Lon;
							_verbruikDataRecord.alt = inpRecord.SJVDelta*inpRecord.aantalAanslDef*0.000018; // negative delta is good, less use of energie
							verbruikDataELKDeltaLess20132014.push(_verbruikDataRecord);
							//test
							//if (i>jsonResponse.records.length/2) break;
						}

						heatmapELKDeltaLess20132014Layer.setLatLngs(verbruikDataELKDeltaLess20132014);

						// data for heatmap Liander verbruik
						for(i=0;i<jsonResponse.records.length;i++) {
							inpRecord = jsonResponse.records[i];
							if (inpRecord.SJVDelta<=0) continue; //skip zero or less values
							_verbruikDataRecord = [];
							_verbruikDataRecord[0] = inpRecord.WGS84Lat;
							_verbruikDataRecord[1] = inpRecord.WGS84Lon;
							_verbruikDataRecord.alt = inpRecord.SJVDelta*inpRecord.aantalAanslDef*0.000018; // negative delta is good, less use of energie
							verbruikDataELKDeltaMore20132014.push(_verbruikDataRecord);
							//test
							//if (i>jsonResponse.records.length/2) break;
						}

						heatmapELKDeltaMore20132014Layer.setLatLngs(verbruikDataELKDeltaMore20132014);


						// data for heatmap Liander verbruik
						for(i=0;i<jsonResponse.records.length;i++) {
							inpRecord = jsonResponse.records[i];
							if (inpRecord.richtingPrc==100) continue; //skip 100% = no return energie
							_verbruikDataRecord = [];
							_verbruikDataRecord[0] = inpRecord.WGS84Lat;
							_verbruikDataRecord[1] = inpRecord.WGS84Lon;
							_verbruikDataRecord.alt = ((100-inpRecord.richtingPrc))*inpRecord.SJVTotaal*0.000000129; // 100% is geen retour, 97% is 3 % retour
							verbruikDataELKRichtingPrc20132014.push(_verbruikDataRecord);
							//test
							//if (i>jsonResponse.records.length/2) break;
						}

						heatmapELKRichtingPrc20132014Layer.setLatLngs(verbruikDataELKRichtingPrc20132014);

						// data for heatmap Liander verbruik
						for(i=0;i<jsonResponse.records.length;i++) {
							inpRecord = jsonResponse.records[i];
							if (inpRecord.richtingPrcDelta>=0) continue; //skip zeroes and less retour
							_verbruikDataRecord = [];
							_verbruikDataRecord[0] = inpRecord.WGS84Lat;
							_verbruikDataRecord[1] = inpRecord.WGS84Lon;
							_verbruikDataRecord.alt = (inpRecord.richtingPrcDelta*-1)*inpRecord.SJVTotaal*0.000000129; // negative delta is good, less use of energie
							verbruikDataELKDeltaRichtingPrc20132014.push(_verbruikDataRecord);
							//test
							//if (i>jsonResponse.records.length/2) break;
						}

						heatmapELKDeltaRichtingPrc20132014Layer.setLatLngs(verbruikDataELKDeltaRichtingPrc20132014);

					} else {


						// data for heatmap Liander verbruik
						for(i=0;i<jsonResponse.records.length;i++) {
							inpRecord = jsonResponse.records[i];
							_verbruikDataRecord = [];
							_verbruikDataRecord[0] = inpRecord.WGS84Lat;
							_verbruikDataRecord[1] = inpRecord.WGS84Lon;
							//_verbruikDataRecordGAS.alt = inpRecordGas.SJV*0.001;
							_verbruikDataRecord.alt = inpRecord.SJVTotaal*0.000005;
							// inpRecordGas.aantalAanslDef
							verbruikDataGAS.push(_verbruikDataRecord);
						}
						heatmapGASLayer.setLatLngs(verbruikDataGAS);

						// data for heatmap Liander verbruik
						for(i=0;i<jsonResponse.records.length;i++) {
							inpRecord = jsonResponse.records[i];
							if (inpRecord.SJVDelta>=0) continue; //skip greater or equal zero values
							_verbruikDataRecord = [];
							_verbruikDataRecord[0] = inpRecord.WGS84Lat;
							_verbruikDataRecord[1] = inpRecord.WGS84Lon;
							_verbruikDataRecord.alt = inpRecord.SJVDelta*inpRecord.aantalAanslDef*0.00008; // negative delta is good, less use of energie
							verbruikDataGASDeltaLess20132014.push(_verbruikDataRecord);
						}
						heatmapGASDeltaLess20132014Layer.setLatLngs(verbruikDataGASDeltaLess20132014);

						// data for heatmap Liander verbruik
						for(i=0;i<jsonResponse.records.length;i++) {
							inpRecord = jsonResponse.records[i];
							if (inpRecord.SJVDelta<=0) continue; //skip zero or less values
							_verbruikDataRecord = [];
							_verbruikDataRecord[0] = inpRecord.WGS84Lat;
							_verbruikDataRecord[1] = inpRecord.WGS84Lon;
							_verbruikDataRecord.alt = inpRecord.SJVDelta*inpRecord.aantalAanslDef*0.00008; // negative delta is good, less use of energie
							verbruikDataGASDeltaMore20132014.push(_verbruikDataRecord);
						}
						heatmapGASDeltaMore20132014Layer.setLatLngs(verbruikDataGASDeltaMore20132014);

					}
				} // end of if (xmlhttpHeatmap.readyState==4 && xmlht
  			} // end of xmlhttpHeatmap.onreadystatechange

			xmlhttpHeatmap.open("GET",lianderVerbruikLayerUrl,true);
			xmlhttpHeatmap.send();


		}

}

// ===============  heatmap  energieverbruik end




	function formatLocalDate(inpDate) {
		var testje = inpDate.toISOString();
    	var now = new Date(inpDate.getTime()),
        	tzo = -now.getTimezoneOffset(),
        	dif = tzo >= 0 ? '+' : '-',
        	pad = function(num) {
            	var norm = Math.abs(Math.floor(num));
            	return (norm < 10 ? '0' : '') + norm;
        	};
    	return now.getFullYear()
       	 	+ '-' + pad(now.getMonth()+1)
       	 	+ '-' + pad(now.getDate())
       	 	+ 'T' + pad(now.getHours())
       	 	+ ':' + pad(now.getMinutes())
       	 	+ ':' + pad(now.getSeconds())
			+ '.000Z'
//       	 	+ dif + pad(tzo / 60)
//        	+ ':' + pad(tzo % 60);
	}


	var aireasDomainsRanges = {
		'SPMI': {
			domainStrict: [ 0,	14,	34,	61,	95,	100 ],  // 0=lowest value, 100=max value
			rangeStrict: [ '#139FEB',
					'#139FEC',
					'#EFDF6D',
					'#FDAB33',
					'#FC0008',
					'#5C198E'
				],
			domainSpecial: [ 0,7,10,	14,20,27,	34,48,	61,68,	95,	100 ],  // 0=lowest value, 100=max value
			rangeSpecial: [ '#139FEB',
					'#139FEC','#43CFEC','#73EFEC',   //'#00FFDD',
					'#EFDF6D','#FFFF0D','#FFEE00',
					'#FDAB33','#FD6B33',
					'#FC0008','#DD0000',
					'#5C198E','#5C198E'
				],
			domainGroups: 5,
			domain: null,
			range: null,
			scale: null,
			scaleQuantize: null,
			scaleLinear: null,
			legendLabel: 'SPMI'
		},
		'PM1': {
			domainStrict: [ 0,	14,	34,	61,	95,	100 ],  // 0=lowest value, 100=max value
			rangeStrict: [ '#139FEB',
					'#139FEC',
					'#EFDF6D',
					'#FDAB33',
					'#FC0008',
					'#5C198E'
				],
			domainSpecial: [ 0,7,10,	14,20,27,	34,48,	61,68,	95,	100 ],  // 0=lowest value, 100=max value
			rangeSpecial: [ '#139FEB',
					'#139FEC','#43CFEC','#73EFEC',   //'#00FFDD',
					'#EFDF6D','#FFFF0D','#FFEE00',
					'#FDAB33','#FD6B33',
					'#FC0008','#DD0000',
					'#5C198E','#5C198E'
				],
			domainGroups: 5,
			domain: null,
			range: null,
			scale: null,
			scaleQuantize: null,
			scaleLinear: null,
			legendLabel: 'PM1'
		},
		'PM25': {
			domainStrict: [ 0,	20,	50,	90,	140,	170 ],  // 0=lowest value, 170=max value
			rangeStrict: [ '#139FEB',
					'#139FEC',
					'#EFDF6D',
					'#FDAB33',
					'#FC0008',
					'#5C198E'
				],
			domainSpecial: [ 0,10,15,	20,30,40,	50,70,	90,100,	140,	170 ],  // 0=lowest value, 170=max value
			rangeSpecial: [ '#139FEB',
					'#139FEC','#43CFEC','#73EFEC',   //'#00FFDD',
					'#EFDF6D','#FFFF0D','#FFEE00',
					'#FDAB33','#FD6B33',
					'#FC0008','#DD0000',
					'#5C198E','#5C198E'
				],
			domainGroups: 5,
			domain: null,
			range: null,
			scale: null,
			scaleQuantize: null,
			scaleLinear: null,
			legendLabel: 'PM2.5'
		},
		'PM10': {
			domainStrict: [ 0,	30,	75,	125,	200,	250 ],  // 0=lowest value, 250=max value
			rangeStrict: [ '#139FEB',
					'#139FEC',
					'#EFDF6D',
					'#FDAB33',
					'#FC0008',
					'#5C198E'
				],
			domainSpecial: [ 0,10,20,	30,45,60,	75,100,	125,150,	200,	250 ],  // 0=lowest value, 250=max value
			rangeSpecial: [ '#139FEB',
					'#139FEC','#43CFEC','#73EFEC',   //'#00FFDD',
					'#EFDF6D','#FFFF0D','#FFEE00',
					'#FDAB33','#FD6B33',
					'#FC0008','#DD0000',
					'#5C198E','#5C198E'
				],
			domainGroups: 5,
			domain: null,
			range: null,
			scale: null,
			scaleQuantize: null,
			scaleLinear: null,
			legendLabel: 'PM10'
		},
		'UFP': {
			domainStrict: [ 0,	6,	15,	25,	40,	60 ],  // 0=lowest value, 60000=max value  in units of 1000 particals
			rangeStrict: [ '#139FEB',
					'#139FEC',
					'#EFDF6D',
					'#FDAB33',
					'#FC0008',
					'#5C198E'
				],
			domainSpecial: [ 0,2,4,	6,9,12,	15,20,	25,30,	40,	60 ],  // 0=lowest value, 60000=max value  in units of 1000 particals
			rangeSpecial: [ '#139FEB',
					'#139FEC','#43CFEC','#73EFEC',   //'#00FFDD',
					'#EFDF6D','#FFFF0D','#FFEE00',
					'#FDAB33','#FD6B33',
					'#FC0008','#DD0000',
					'#5C198E','#5C198E'
				],
			domainGroups: 5,
			domain: null,
			range: null,
			scale: null,
			scaleQuantize: null,
			scaleLinear: null,
			legendLabel: 'UFP (x1000)'
		},
		'OZON': {
			domainStrict: [ 0,	40,	100,	180,	240,	300 ],  // 0=lowest value, 100=max value
			rangeStrict: [ '#139FEB',
					'#139FEC',
					'#EFDF6D',
					'#FDAB33',
					'#FC0008',
					'#5C198E'
				],
			domainSpecial: [ 0,15,30,	40,60,80,	100,140,	180,200,	240,	300 ],  // 0=lowest value, 100=max value
			rangeSpecial: [ '#139FEB',
					'#139FEC','#43CFEC','#73EFEC',   //'#00FFDD',
					'#EFDF6D','#FFFF0D','#FFEE00',
					'#FDAB33','#FD6B33',
					'#FC0008','#DD0000',
					'#5C198E','#5C198E'
				],
			domainGroups: 5,
			domain: null,
			range: null,
			scale: null,
			scaleQuantize: null,
			scaleLinear: null,
			legendLabel: 'Ozon'
		},
		'HUM': {
			domainStrict: [ 0,	30,	50,	70,	90,	100 ],  // 0=lowest value, 100=max value
			rangeStrict: [ '#139FEB',
					'#139FEC',
					'#EFDF6D',
					'#FDAB33',
					'#FC0008',
					'#5C198E'
				],
			domainSpecial: [ 0,10,20,	30,37,44,	50,60,	70,80,	90,	100 ],  // 0=lowest value, 100=max value
			rangeSpecial: [ '#139FEB',
					'#139FEC','#43CFEC','#73EFEC',   //'#00FFDD',
					'#EFDF6D','#FFFF0D','#FFEE00',
					'#FDAB33','#FD6B33',
					'#FC0008','#DD0000',
					'#5C198E','#5C198E'
				],
			domainGroups: 5,
			domain: null,
			range: null,
			scale: null,
			scaleQuantize: null,
			scaleLinear: null,
			legendLabel: 'Humidity'
		},
		'CELC': {
			domainStrict: [ -10,	0,	10,	20,	30,	40 ],  // 0=lowest value, 100=max value
			rangeStrict: [ '#139FEB',
					'#139FEC',
					'#EFDF6D',
					'#FDAB33',
					'#FC0008',
					'#5C198E'
				],
			domainSpecial: [ -10,7,4,	0,4,7,	10,15,	20,25,	30,	40 ],  // 0=lowest value, 100=max value
			rangeSpecial: [ '#139FEB',
					'#139FEC','#43CFEC','#73EFEC',   //'#00FFDD',
					'#EFDF6D','#FFFF0D','#FFEE00',
					'#FDAB33','#FD6B33',
					'#FC0008','#DD0000',
					'#5C198E','#5C198E'
				],
			domainGroups: 5,
			domain: null,
			range: null,
			scale: null,
			scaleQuantize: null,
			scaleLinear: null,
			legendLabel: 'Celsius'
		},
		'NO2': {
			domainStrict: [ 0,	30,	75,	125,	200,	250 ],  // 0=lowest value, 250=max value
			rangeStrict: [ '#139FEB',
					'#139FEC',
					'#EFDF6D',
					'#FDAB33',
					'#FC0008',
					'#5C198E'
				],
			domainSpecial: [ 0,10,20,	30,45,60,	75,100,	125,150,	200,	250 ],  // 0=lowest value, 250=max value
			rangeSpecial: [ '#139FEB',
					'#139FEC','#43CFEC','#73EFEC',   //'#00FFDD',
					'#EFDF6D','#FFFF0D','#FFEE00',
					'#FDAB33','#FD6B33',
					'#FC0008','#DD0000',
					'#5C198E','#5C198E'
				],
			domainGroups: 5,
			domain: null,
			range: null,
			scale: null,
			scaleQuantize: null,
			scaleLinear: null,
			legendLabel: 'NO2'
		},
		'SDS011_PM25': {
			domainStrict: [ 0,	20,	50,	90,	140,	170 ],  // 0=lowest value, 170=max value
			rangeStrict: [ '#139FEB',
					'#139FEC',
					'#EFDF6D',
					'#FDAB33',
					'#FC0008',
					'#5C198E'
				],
			domainSpecial: [ 0,10,15,	20,30,40,	50,70,	90,100,	140,	170 ],  // 0=lowest value, 170=max value
			rangeSpecial: [ '#139FEB',
					'#139FEC','#43CFEC','#73EFEC',   //'#00FFDD',
					'#EFDF6D','#FFFF0D','#FFEE00',
					'#FDAB33','#FD6B33',
					'#FC0008','#DD0000',
					'#5C198E','#5C198E'
				],
			domainGroups: 5,
			domain: null,
			range: null,
			scale: null,
			scaleQuantize: null,
			scaleLinear: null,
			legendLabel: 'PM2.5'
		}
	}

	for (var avgTypeKey in aireasDomainsRanges) {

		aireasDomainsRanges[avgTypeKey].domain = aireasDomainsRanges[avgTypeKey].domainSpecial;
		aireasDomainsRanges[avgTypeKey].range  = aireasDomainsRanges[avgTypeKey].rangeSpecial;

		aireasDomainsRanges[avgTypeKey].scaleQuantize = d3.scale.quantize()
				.domain(aireasDomainsRanges[avgTypeKey].domainSpecial)
				.range (aireasDomainsRanges[avgTypeKey].rangeSpecial);
		aireasDomainsRanges[avgTypeKey].scaleLinear = d3.scale.linear()
				.domain(aireasDomainsRanges[avgTypeKey].domain)
				.range (aireasDomainsRanges[avgTypeKey].range);
		aireasDomainsRanges[avgTypeKey].scaleThreshold = d3.scale.threshold()
				.domain(aireasDomainsRanges[avgTypeKey].domain)
				.range (aireasDomainsRanges[avgTypeKey].range);

		aireasDomainsRanges[avgTypeKey].scale  = aireasDomainsRanges[avgTypeKey].scaleThreshold;

	}

		var startStddevA, startStddevB, startStddevC,
			scaleStddevA,
			startAvgA, startAvgB, startAvgC, startAvgD, startAvgE, startAvgF,
			scaleAvgA;

		var initDomainsRangesScales = function() {  // conform RIVM schema voor PM1



			startStddevA 	= 7;
			startStddevB 	= 8;
			startStddevC 	= 9;
			scaleStddevA 	= d3.scale.quantize()
				.domain([startStddevA,startStddevB, startStddevC])
				.range(['#9999FF','#4444FF','#0000FF']);

			startAvgA 	= 11;
			startAvgB 	= 13;
			startAvgC 	= 15;
			startAvgD 	= 16;
			startAvgE 	= 17;
			startAvgF 	= 18;
			scaleAvgA 	= d3.scale.quantize()
				.domain([startAvgA,startAvgB, startAvgC, startAvgD, startAvgE, startAvgF])
				.range(['#FFFFFF','#DDFFDD','#AAFFAA','#77FF77','#44FF44','#00FF00']);

		}


/*
		aireasGridGemLayer = new L.geoJson(null, {
			  layerType:"aireasGridGemLayer"
			, avgType: aireasAvgType
			, style: function (feature) {
				var color="#000000";
				var fillOpacity = 0.4;
				var cr=0;
				var cy=0;
				var cg=0;
				var r = 0;
				var g = 0;
				var b = 0;
				///var valueRounded = Math.round(feature.properties.avg_pm_all_hr*10)/10;
				var valueRounded = feature.properties.avg_avg; //Math.round(feature.properties.avg_avg*10)/10;

//				var red=false, yellow=false, green=false;
//				if (valueRounded > 0 && valueRounded<7) green = true;
//				if (valueRounded >= 7 && valueRounded<10) yellow = true;
//				if (valueRounded >= 10) red = true;



				color = aireasDomainsRanges[aireasAvgType].scale(valueRounded);

				if (valueRounded == 0) {
					fillOpacity = 0.1;
				} else {
					fillOpacity = 0.8 + (valueRounded%2)/10;  // domainGroups ; //0.8;
				}

				var opacity = 0.6; //line opacity
        		return {color: '#888', opacity:opacity, weight:1, fillColor:color, fillOpacity:fillOpacity};
    			}
			, onEachFeature:onEachAireasGridGemFeature
			, pointToLayer: function (feature, latlng) {
				return L.marker(latlng, { icon: trainIcon} );
				}
			, refreshData:true
			//, loadDataOnce:

		});
*/

/*
		function loadDataAireasGridGemLayer(layer, options) {
			//var _tmpDate1 = new Date(retrieveddatemax);

			for (var i=0; i<retrievedDateCache.length;i++) {
				var diff = retrievedDateCache[i].retrievedDateDate.getTime() - new Date(options.retrievedDateMax).getTime();
				if (diff > -480000 && diff < 480000) {  //less than 9min = hit
					retrievedDateMax = retrievedDateCache[i].retrievedDate;
					//console.log('retrieveddate (cache/hit): ' + retrievedDateMax + ' '+options.retrievedDateMax);
					window.setTimeout(function(){
						layer.clearLayers();
						layer.addData(retrievedDateCache[i].data);
						layer.layerControl[0].setActiveDateTime(retrievedDateMax, '(cache)');  //timeSliderCtrl
						if (options.next) {
							var _newDate = new Date(new Date(retrievedDateMax).getTime()+ 600000);  // +10 minutes for next measure, no need for extra marge here
							//console.log('retrieveddate next : ' + _newDate.toISOString());
							playSliderMovie(layer, _newDate, options.avgType);
						}
					}, 200);
					return;
				}
			}

			var retrievedDatePlusMargeIso = new Date(new Date(options.retrievedDateMax).getTime()+60000).toISOString();

//			ajaxGetData(APRI.getConfig().urlSystemRoot +
			ajaxGetData( siteAireas +
				 "/data/aireas/getAireasGridGemInfo/*?retrieveddatemax=" +
				 retrievedDatePlusMargeIso + '&avgType=' + options.avgType ,
				function(data) {
					var _data = JSON.parse(data);
					if (_data.length == 0 ) return;
					var _retrievedDate = _data[0].properties.retrieveddate;

					var _retrievedDateCacheRecord={};
					_retrievedDateCacheRecord.data = _data;
					_retrievedDateCacheRecord.retrievedDate = _retrievedDate;
					_retrievedDateCacheRecord.retrievedDateDate = new Date(_retrievedDate);
					retrievedDateCache.push(_retrievedDateCacheRecord);  // store in cache
					//console.log('retrieveddate (new cache): ' + _retrievedDate);


//					retrievedDateMax = _retrievedDate; //_retrievedDate?_retrievedDate:options.retrievedDateMax;
					layer.clearLayers();
					layer.addData(_data);
					layer.layerControl[0].setActiveDateTime(_retrievedDateCacheRecord.retrievedDateDate, '(db)'); //timeSliderCtrl

					if (options.next) {
						var _newDate = new Date(new Date(options.retrievedDateMax).getTime()+ 600000);  // +10 minutes for next measure, no need for extra marge here
						//console.log('retrieveddate next : ' + _newDate.toISOString());
						window.setTimeout(function(){
							playSliderMovie(layer, _newDate, options.avgType);
						}, 200);
					}
				}
			)
		}
*/

        function onEachAireasGridGemFeature (feature, layer) {
            // does this feature have a property named popupContent?
            if (feature.properties && feature.properties.bu_naam) {
                layer.bindPopup(feature.properties.bu_naam +
				'<BR/><DIV style="width:132px;">------------------------</DIV>' +
				'<BR/>' + 'Leeftijd  0-14jr: ' + feature.properties.p_00_14_jr + '%' +
				'<BR/>' + 'Leeftijd 15-24jr: ' + feature.properties.p_15_24_jr + '%' +
				'<BR/>' + 'Leeftijd 25-44jr: ' + feature.properties.p_25_44_jr + '%' +
				'<BR/>' + 'Leeftijd 45-64jr: ' + feature.properties.p_45_64_jr + '%' +
				'<BR/>' + 'Leeftijd 65-e.o.: ' + feature.properties.p_65_eo_jr + '%');
            }


			(function(layer, properties) {
				// Create a mouseover event
      			layer.on("mouseover", function (e) {

					var _tmpDate = new Date(Date.parse(properties.retrieveddate));
					var _dateFormatted = moment(_tmpDate).format('YYYY/MM/DD HH:mm'); //new Date(properties.avg_pm1_hr);
					var _data = [
						['Datum', _dateFormatted],
						[properties.avgType, properties.avg_avg]
					//	['PM1', properties.avg_pm1_hr],
					//	['PM2.5', properties.avg_pm25_hr],
					//	['PM10', properties.avg_pm10_hr],
					//	['PM Overall', properties.avg_pm_all_hr]
					]
					var _popupInfoCtrlTr = popupInfoCtrl
						.getTableContainer()
						//.append("table") // = d3.select('#'+popupInfoCtrl.id).select('.popupinfo-text');
						.selectAll('tr')
						.data(_data);

					_popupInfoCtrlTr
						.enter()
						.append("tr");
					_popupInfoCtrlTr
						.exit()
						.remove();

					var td = _popupInfoCtrlTr.selectAll("td")
						.data(function(d) {
							return d;
							});
					td
						.enter().append("td")
						.text(function(d) {
							return d;});
					td
						.exit()
						.remove();

						// .selectAll('.popupinfo-text');
					e.target.setStyle({
						//fillOpacity: 0.8,
						opacity: 0.8, color:'#000'
						});
        			// Change the style to the highlighted version
        	//		layer.setStyle(highlightStyle);
        			// Create a popup with a unique ID linked to this record
					var popup 	= document.createElement('div');
					popup.id 	= 'popup-x' + properties.cell_x + '-y' + properties.cell_y;
					popup.style.position = 'absolute';
					popup.style.bottom = '150px';
					popup.style.left = '140px';
					popup.style.zIndex = 1002;
					popup.style.backgroundColor = 'white';
					popup.style.padding = '8px';
					popup.style.border = '1px solid #ccc';
        			// Insert a headline into that popup
					var head = document.createElement('div');
					var _innerHtml = "<div>Uur gemiddelde:</div>" + _dateFormatted + '<BR/>' + //todo
						properties.avg_type + ": " + properties.avg_avg;

//						"PM1: " + properties.avg_pm1_hr + '<BR/>' +
//						"PM2.5: " + properties.avg_pm25_hr + '<BR/>' +
//						"PM10: " + properties.avg_pm10_hr + '<BR/>' +
//						"PM All: " + properties.avg_pm_all_hr + '<BR/>' +
//						"cell: (" + properties.cell_x + ',' + properties.cell_y+ ')';
					//var textNode = document.createTextNode(_text);
					//head.appendChild(textNode);
					head.innerHTML = _innerHtml;
					head.style.fontSize = '14px';
					head.style.marginBottom = '3px';
					//head.appendTo(popup);
					popup.appendChild(head);

        			// Add the popup to the map
        			//popup.appendTo("#map");
//        			popup.appendTo("#"+this.apriFormContainerId + '-leafletjs-container');
        			//popup.appendTo("#"+map._container.id);

					//var container = document.getElementById("#"+map._container.id)
					mapPanes.popupPane.appendChild(popup);
				});
      			// Create a mouseout event that undoes the mouseover changes
      			layer.on("mouseout", function (e) {

					var _data = [
					]
					var _popupInfoCtrlTr = popupInfoCtrl
						.getTableContainer()
						//.append("table") // = d3.select('#'+popupInfoCtrl.id).select('.popupinfo-text');
						.selectAll('tr')
						.data(_data);
					_popupInfoCtrlTr
						.exit()
						.remove();
					//var _style = e.target.options.style(e.target.feature);

					//if (e.layer.resetStyle) {
					//	e.layer.resetStyle(e.target);
					//}
					e.target.setStyle({
						//fillOpacity: 0.8,
						opacity: 0.6, color:'#888'
					});

					//aireasGridGemLayer.resetStyle(e.target); //e.layer.options.style(e.target.feature));
        			// Start by reverting the style back
        	//		layer.setStyle(defaultStyle);
        			// And then destroying the popup
					var _popupElement = document.getElementById('popup-x' + properties.cell_x + '-y' + properties.cell_y)
					if (_popupElement) {
						_popupElement.remove();
					}
      			});
      			// Close the "anonymous" wrapper function, and call it while passing
      			// in the variables necessary to make the events work the way we want.
			})(layer, feature.properties);
        }
        function onEachLuftDatenGridFeature (feature, layer) {
            // does this feature have a property named popupContent?
 /*
            if (feature.properties && feature.properties.bu_naam) {
                layer.bindPopup(feature.properties.bu_naam +
				'<BR/><DIV style="width:132px;">------------------------</DIV>' +
				'<BR/>' + 'Leeftijd  0-14jr: ' + feature.properties.p_00_14_jr + '%' +
				'<BR/>' + 'Leeftijd 15-24jr: ' + feature.properties.p_15_24_jr + '%' +
				'<BR/>' + 'Leeftijd 25-44jr: ' + feature.properties.p_25_44_jr + '%' +
				'<BR/>' + 'Leeftijd 45-64jr: ' + feature.properties.p_45_64_jr + '%' +
				'<BR/>' + 'Leeftijd 65-e.o.: ' + feature.properties.p_65_eo_jr + '%');
            }
*/

			(function(layer, properties) {
				// Create a mouseover event
      			layer.on("mouseover", function (e) {

					var _tmpDate = new Date(Date.parse(properties.retrieveddate));
					var _dateFormatted = moment(_tmpDate).format('YYYY/MM/DD HH:mm'); //new Date(properties.avg_pm1_hr);
					var _data = [
						['Datum', _dateFormatted],
						[properties.avgType, properties.avg_avg]
					//	['PM1', properties.avg_pm1_hr],
					//	['PM2.5', properties.avg_pm25_hr],
					//	['PM10', properties.avg_pm10_hr],
					//	['PM Overall', properties.avg_pm_all_hr]
					]
					var _popupInfoCtrlTr = popupInfoCtrl
						.getTableContainer()
						//.append("table") // = d3.select('#'+popupInfoCtrl.id).select('.popupinfo-text');
						.selectAll('tr')
						.data(_data);

					_popupInfoCtrlTr
						.enter()
						.append("tr");
					_popupInfoCtrlTr
						.exit()
						.remove();

					var td = _popupInfoCtrlTr.selectAll("td")
						.data(function(d) {
							return d;
							});
					td
						.enter().append("td")
						.text(function(d) {
							return d;});
					td
						.exit()
						.remove();

						// .selectAll('.popupinfo-text');
					e.target.setStyle({
						//fillOpacity: 0.8,
						opacity: 0.8, color:'#000'
						});
        			// Change the style to the highlighted version
        	//		layer.setStyle(highlightStyle);
        			// Create a popup with a unique ID linked to this record
					var popup 	= document.createElement('div');
					popup.id 	= 'popup-x' + properties.cell_x + '-y' + properties.cell_y;
					popup.style.position = 'absolute';
					popup.style.bottom = '150px';
					popup.style.left = '140px';
					popup.style.zIndex = 1002;
					popup.style.backgroundColor = 'white';
					popup.style.padding = '8px';
					popup.style.border = '1px solid #ccc';
        			// Insert a headline into that popup
					var head = document.createElement('div');
					var _innerHtml = "<div>Uur gemiddelde:</div>" + _dateFormatted + '<BR/>' + //todo
						properties.avg_type + ": " + properties.avg_avg;

//						"PM1: " + properties.avg_pm1_hr + '<BR/>' +
//						"PM2.5: " + properties.avg_pm25_hr + '<BR/>' +
//						"PM10: " + properties.avg_pm10_hr + '<BR/>' +
//						"PM All: " + properties.avg_pm_all_hr + '<BR/>' +
//						"cell: (" + properties.cell_x + ',' + properties.cell_y+ ')';
					//var textNode = document.createTextNode(_text);
					//head.appendChild(textNode);
					head.innerHTML = _innerHtml;
					head.style.fontSize = '14px';
					head.style.marginBottom = '3px';
					//head.appendTo(popup);
					popup.appendChild(head);

        			// Add the popup to the map
        			//popup.appendTo("#map");
//        			popup.appendTo("#"+this.apriFormContainerId + '-leafletjs-container');
        			//popup.appendTo("#"+map._container.id);

					//var container = document.getElementById("#"+map._container.id)
					mapPanes.popupPane.appendChild(popup);
				});
      			// Create a mouseout event that undoes the mouseover changes
      			layer.on("mouseout", function (e) {

					var _data = [
					]
					var _popupInfoCtrlTr = popupInfoCtrl
						.getTableContainer()
						//.append("table") // = d3.select('#'+popupInfoCtrl.id).select('.popupinfo-text');
						.selectAll('tr')
						.data(_data);
					_popupInfoCtrlTr
						.exit()
						.remove();
					//var _style = e.target.options.style(e.target.feature);

					//if (e.layer.resetStyle) {
					//	e.layer.resetStyle(e.target);
					//}
					e.target.setStyle({
						//fillOpacity: 0.8,
						opacity: 0.4, color:'#888'
					});

					//aireasGridGemLayer.resetStyle(e.target); //e.layer.options.style(e.target.feature));
        			// Start by reverting the style back
        	//		layer.setStyle(defaultStyle);
        			// And then destroying the popup
					var _popupElement = document.getElementById('popup-x' + properties.cell_x + '-y' + properties.cell_y)
					if (_popupElement) {
						_popupElement.remove();
					}
      			});
      			// Close the "anonymous" wrapper function, and call it while passing
      			// in the variables necessary to make the events work the way we want.
			})(layer, feature.properties);
        }

        function onEachAireasMeetkastFeature (feature, layer) {
            // does this feature have a property named popupContent?
            if (feature.properties && feature.properties.airbox) {
				var _airbox 		= feature.properties.airbox;
				var _locationName 	= feature.properties.airbox_location + ' ' + feature.properties.airbox_postcode;
				var _locationType 	= feature.properties.airbox_location_type ;
				var _locationDesc 	= feature.properties.airbox_location_desc ;
				var _locationX		= feature.properties.airbox_x ;
				var _locationY		= feature.properties.airbox_y ;

//				var _locationName="";
//				if (Addresses[_airbox]) {
//					var _voorv = Addresses[_airbox].voorv?Addresses[_airbox].voorv+' ':'';
//					_locationName = _voorv + Addresses[_airbox].adres + ' ' + Addresses[_airbox].pcw;
//				}

				var _popupInnerHtml = '<h3>Airboxlocatie:</h3><div style="width:300px;">' + _locationName + ' (' + _airbox + ')</div><div>'+ _locationType +' '+ _locationDesc +' '+  _locationX +'/'+ _locationY + '</div><div>Klik voor meetgegevens</div>';
					if (feature.properties.ufp>0) {
						_popupInnerHtml += '<div>' + 'UFP' + ': ' + feature.properties.ufp + '</div>';
					}
					if (feature.properties.pm1>0) {
						_popupInnerHtml += '<div>' + 'PM1' + ': ' + feature.properties.pm1 + '</div>';
					}
					if (feature.properties.pm25>0) {
						_popupInnerHtml += '<div>' + 'PM25' + ': ' + feature.properties.pm25 + '</div>';
					}
					if (feature.properties.pm10>0) {
						_popupInnerHtml += '<div>' + 'PM10' + ': ' + feature.properties.pm10 + '</div>';
					}
					if (feature.properties.ozon>0) {
						_popupInnerHtml += '<div>' + 'Ozon' + ': ' + feature.properties.ozon + '</div>';
					}
					if (feature.properties.no2>0) {
						_popupInnerHtml += '<div>' + 'NO2' + ': ' + feature.properties.no2 + '</div>';
					}


                layer.bindPopup(_popupInnerHtml);
            }

			(function(layer, properties) {
				// Create a mouseover event
      			layer.on("mouseover", function (e) {
					this.openPopup();
					return;
        			// Create a popup with a unique ID linked to this record
					var popup 	= document.createElement('div');
					popup.id 	= 'popup-' + properties.airbox;
					popup.style.position = 'absolute';
					popup.style.bottom = '85px';
					popup.style.left = '50px';
					popup.style.zIndex = 1002;
					popup.style.backgroundColor = 'white';
					popup.style.padding = '8px';
					popup.style.border = '1px solid #ccc';
        			// Insert a headline into that popup
					var head = document.createElement('div');
					var _innerHtml = '<p>' + properties.name + ' (' + properties.airbox + ')</p>';
					head.innerHTML = _innerHtml;
					head.style.fontSize = '16px';
					head.style.marginBottom = '3px';
					popup.appendChild(head);
					mapPanes.popupPane.appendChild(popup);
				});

      			layer.on("click", function (e) {
					var popup 	= document.createElement('div');
				/*	popup.id 	= 'popup-' + properties.airbox;
					popup.style.position = 'absolute';
					popup.style.bottom = '85px';
					popup.style.left = '50px';
					popup.style.zIndex = 1002;
					popup.style.backgroundColor = 'white';
					popup.style.padding = '8px';
					popup.style.border = '1px solid #ccc';
        			// Insert a headline into that popup
					var head = document.createElement('div');
					var _innerHtml = properties.airbox;
					head.innerHTML = _innerHtml;
					head.style.fontSize = '16px';
					head.style.marginBottom = '3px';
					popup.appendChild(head);
					mapPanes.popupPane.appendChild(popup);
*/
					showAireasMeetkastInfo(e.target.feature);
				});

      			// Create a mouseout event that undoes the mouseover changes
      			layer.on("mouseout", function (e) {
					this.closePopup();
					//document.getElementById('popup-' + properties.airbox).remove();
      			});
      			// Close the "anonymous" wrapper function, and call it while passing
      			// in the variables necessary to make the events work the way we want.
			})(layer, feature.properties);
        }

        function onEachBijenGifFeature (feature, layer) {
            // does this feature have a property named popupContent?
            if (feature.properties && feature.properties.aquoCode) {
				var _popupInnerHtml = '<h3>Waterschap:</h3><div style="width:300px;">' + feature.properties.name +'</div>';
				_popupInnerHtml += '<div>' + 'aquocode' + ': ' + feature.properties.aquoCode + '</div>';
				_popupInnerHtml += '<div>' + 'jaar' + ': ' + feature.properties.year + '</div>';
				if (feature.properties.JGMKNnof != undefined) {
					_popupInnerHtml += '<div>' + 'Normfactor KRW' + ': ' + feature.properties.JGMKNnof + '</div>';
				}
				if (feature.properties.JGMKNcmlnof != undefined) {
					_popupInnerHtml += '<div>' + 'Normfactor CML' + ': ' + feature.properties.JGMKNcmlnof + '</div>';
				}
                layer.bindPopup(_popupInnerHtml);
            }

			(function(layer, properties) {
				// Create a mouseover event
      			layer.on("mouseover", function (e) {
					this.openPopup();
					return;
        			// Create a popup with a unique ID linked to this record
					var popup 	= document.createElement('div');
					popup.id 	= 'popup-' + properties.airbox;
					popup.style.position = 'absolute';
					popup.style.bottom = '85px';
					popup.style.left = '50px';
					popup.style.zIndex = 1002;
					popup.style.backgroundColor = 'white';
					popup.style.padding = '8px';
					popup.style.border = '1px solid #ccc';
        			// Insert a headline into that popup
					var head = document.createElement('div');
					var _innerHtml = '<p>' + properties.name + ' (' + properties.airbox + ')</p>';
					head.innerHTML = _innerHtml;
					head.style.fontSize = '16px';
					head.style.marginBottom = '3px';
					popup.appendChild(head);
					mapPanes.popupPane.appendChild(popup);
				});

      			layer.on("click", function (e) {
					var popup 	= document.createElement('div');
				/*	popup.id 	= 'popup-' + properties.airbox;
					popup.style.position = 'absolute';
					popup.style.bottom = '85px';
					popup.style.left = '50px';
					popup.style.zIndex = 1002;
					popup.style.backgroundColor = 'white';
					popup.style.padding = '8px';
					popup.style.border = '1px solid #ccc';
        			// Insert a headline into that popup
					var head = document.createElement('div');
					var _innerHtml = properties.airbox;
					head.innerHTML = _innerHtml;
					head.style.fontSize = '16px';
					head.style.marginBottom = '3px';
					popup.appendChild(head);
					mapPanes.popupPane.appendChild(popup);
*/
//					showAireasMeetkastInfo(e.target.feature);
				});

      			// Create a mouseout event that undoes the mouseover changes
      			layer.on("mouseout", function (e) {
					if (this.closePopup) this.closePopup();
					else this.invoke('closePopup');  //bug when multipolygon
      			});
      			// Close the "anonymous" wrapper function, and call it while passing
      			// in the variables necessary to make the events work the way we want.
			})(layer, feature.properties);
        }


        function onEachPestInfoStofKentallenFeature (feature, layer) {
            // does this feature have a property named popupContent?
            if (feature.properties && feature.properties.aquoCode) {
				var _popupInnerHtml = '<h3>Pestinfo:</h3><div style="width:300px;">' + feature.properties.name +'</div>';
				_popupInnerHtml += '<div>' + 'aquocode' + ': ' + feature.properties.aquoCode + '</div>';
				_popupInnerHtml += '<div>' + 'jaar' + ': ' + feature.properties.year + '</div>';
				if (feature.properties.JGMKNnof != undefined) {
					_popupInnerHtml += '<div>' + 'Normfactor KRW' + ': ' + feature.properties.JGMKNnof + '</div>';
				}
				if (feature.properties.JGMKNcmlnof != undefined) {
					_popupInnerHtml += '<div>' + 'Normfactor CML' + ': ' + feature.properties.JGMKNcmlnof + '</div>';
				}
                layer.bindPopup(_popupInnerHtml);
            }

			(function(layer, properties) {
				// Create a mouseover event
      			layer.on("mouseover", function (e) {
					this.openPopup();
					return;
        			// Create a popup with a unique ID linked to this record
					var popup 	= document.createElement('div');
					popup.id 	= 'popup-' + properties.airbox;
					popup.style.position = 'absolute';
					popup.style.bottom = '85px';
					popup.style.left = '50px';
					popup.style.zIndex = 1002;
					popup.style.backgroundColor = 'white';
					popup.style.padding = '8px';
					popup.style.border = '1px solid #ccc';
        			// Insert a headline into that popup
					var head = document.createElement('div');
					var _innerHtml = '<p>' + properties.name + ' (' + properties.airbox + ')</p>';
					head.innerHTML = _innerHtml;
					head.style.fontSize = '16px';
					head.style.marginBottom = '3px';
					popup.appendChild(head);
					mapPanes.popupPane.appendChild(popup);
				});

      			layer.on("click", function (e) {
					var popup 	= document.createElement('div');
				/*	popup.id 	= 'popup-' + properties.airbox;
					popup.style.position = 'absolute';
					popup.style.bottom = '85px';
					popup.style.left = '50px';
					popup.style.zIndex = 1002;
					popup.style.backgroundColor = 'white';
					popup.style.padding = '8px';
					popup.style.border = '1px solid #ccc';
        			// Insert a headline into that popup
					var head = document.createElement('div');
					var _innerHtml = properties.airbox;
					head.innerHTML = _innerHtml;
					head.style.fontSize = '16px';
					head.style.marginBottom = '3px';
					popup.appendChild(head);
					mapPanes.popupPane.appendChild(popup);
*/
//					showAireasMeetkastInfo(e.target.feature);
				});

      			// Create a mouseout event that undoes the mouseover changes
      			layer.on("mouseout", function (e) {
					if (this.closePopup) this.closePopup();
					else this.invoke('closePopup');  //bug when multipolygon
      			});
      			// Close the "anonymous" wrapper function, and call it while passing
      			// in the variables necessary to make the events work the way we want.
			})(layer, feature.properties);
        }


	var showAireasMeetkastInfo = function(feature) {
		// Otherwise show the content in a popup, or something.
		var properties = feature.properties;
		var popupView 			= _popupView;
		var popupViewTemplate 	= Handlebars.compile(popupView);

//		var _record = data.features[0];
		var tmpDate = new Date(properties.retrieveddate);
		properties.retrievedDateFormatted = moment(tmpDate).format('YYYY/MM/DD');     //tmpDate.format('yyyy-m-d');
		properties.retrievedTimeFormatted = moment(tmpDate).format('HH:mm');   //tmpDate.format('HH:MM');

//		var _airbox = properties.airbox;
//		var _locationName = properties.airbox;

		var _airbox 		= properties.airbox;
		var _locationName 	= properties.airbox_location + ' ' + properties.airbox_postcode;
//		var _locationType 	= _record.properties.airbox_location_type ;
//		var _locationDesc 	= _record.properties.airbox_location_desc ;
//		var _locationX		= _record.properties.airbox_x ;
//		var _locationY		= _record.properties.airbox_y ;

//		if (Addresses[_airbox]) {
//			var _voorv = Addresses[_airbox].voorv?Addresses[_airbox].voorv+' ':'';
//			_locationName = _voorv + Addresses[_airbox].adres + ' ' + Addresses[_airbox].pcw;
//		}

		properties.locationName = _locationName;
		properties.locationCode = properties.airbox;
		var _content = popupViewTemplate({
			data: properties
		});

		//popup.innerHTML = _content;
    	var popUp = L.popup({ maxWidth: 800, closeButton: false })
//      		.setLatLng(latlng)
//      		.setLatLng(feature.geometry.coordinates)
      		.setLatLng([ feature.geometry.coordinates[1], feature.geometry.coordinates[0] ])
      		.setContent(_content)
      		.openOn(map)
			;

		var closeButton = popUp._container.getElementsByClassName('fa fa-times-circle')[0];
		closeButton.addEventListener("click", function(){
    		map.closePopup();
		});
		var chartContainer 	= popUp._container.getElementsByClassName('chart-wrapper')[0];
		var chartButton 	= popUp._container.getElementsByClassName('measurepoint-wrapper cta')[0];
		chartButton.addEventListener("click", function(){
			properties.container = chartContainer;
    		getPopUpChartData(properties);
		});

		createAireasPopUpView({
			measures: {
				pm1: 	properties.pm1,
				pm25: 	properties.pm25,
				pm10: 	properties.pm10,
				no2:	properties.no2
			}
		});
	}

		var _popupView =
' <html> \
  <head>\
    <title>Geoserver GetFeatureInfo output</title>\
  </head>\
<body>\
				<div class="measurepoint-wrapper head">\
					<div class="measurepoint-data">\
						<span class="measurepoint-address">\
							<i class="fa fa-gauge fa-map-marker"></i>{{data.locationName}} ({{data.locationCode}} {{data.airbox_location_type}} {{data.airbox_location_desc}} {{data.airbox_x}} {{data.airbox_y}})\
						</span>\
					</div>\
					<div class="measurepoint-data">\
						<span class="latest-update-time">\
							<i class="fa fa-gauge fa-clock-o"></i>{{data.retrievedTimeFormatted}} laatste update <i class="fa fa-times-circle"></i>\
						</span>						\
					</div>\
				</div>\
				<div class="chart-wrapper-scroll">\
					<div class="chart-wrapper">\
					</div>\
				</div>\
				<div class="measurepoint-wrapper cta">\
					<i class="fa fa-gauge fa-bar-chart-o"></i><span>Statistieken van de laatste 7 dagen bekijken</span>\
				</div>\
				<div class="gauge-wrapper">\
					<span id="pm1GaugeContainer"></span>\
					<span id="pm25GaugeContainer"></span>\
					<span id="pm10GaugeContainer"></span>\
				</div>\
				<div class="measurepoint-wrapper footer">\
					<span class="gauge-disclaimer"><i class="fa fa-gauge fa-warning"></i>De fijnstofwaardes zijn in &#181;g/m&#179; gemeten.</span>\
			</div>	\
  </body>\
</html>';


var createAireasPopUpView = function (options) {
		// Gauge script
		var gauges = [];

		function createGauge(name, label, min, max)
		{
			var config =
			{
				size: 140,
				label: label,
				name: name,
				min: undefined != min ? min : 0,
				max: undefined != max ? max : 100,
				minorTicks: 5
			}

			var range = config.max - config.min;
			config.yellowZones = [{ from: config.min + range*0.75, to: config.min + range*0.9 }];
			config.redZones = [{ from: config.min + range*0.9, to: config.max }];

			gauges[name] = new ApriD3Gauge();
			gauges[name].createGauge(name + "GaugeContainer", config, options.measures[name] );
			//updateGauges(options.measures);
			gauges[name].render();
		}

		function createGauges()
		{
			createGauge("pm1", "PM1", 0, 10 );
			createGauge("pm25", "PM2.5", 0, 20 );
			createGauge("pm10", "PM10", 0, 25 );
		}

		function updateGauges(gaugeValues)
		{
			for (var key in gauges)
			{
				var value = gaugeValues[key];
				//var value = getRandomValue(gauges[key])
				gauges[key].redraw(value);
			}
		}

		function getRandomValue(gauge)
		{
			var overflow = 0; //10;
			return gauge.config.min - overflow + (gauge.config.max - gauge.config.min + overflow*2) *  Math.random();
		}

		(function initialize()
		{
			createGauges();
			//setInterval(updateGauges, 5000);
		})();


/*
					// Bar script
					var margin = {top: 20, right: 20, bottom: 30, left: 40},
						width = 477 - margin.left - margin.right,
						height = 200 - margin.top - margin.bottom;

					var x = d3.scale.ordinal()
						.rangeRoundBands([0, width], .1);

					var y = d3.scale.linear()
						.range([height, 0]);

					var xAxis = d3.svg.axis()
						.scale(x)
						.orient("bottom");

					var yAxis = d3.svg.axis()
						.scale(y)
						.orient("left")
						.ticks(10);

					var svg = d3.select(".chart-wrapper").append("svg")
						.attr("width", width + margin.left + margin.right)
						.attr("height", height + margin.top + margin.bottom)
						.append("g")
						.attr("transform", "translate(" + margin.left + "," + margin.top + ")");

					d3.tsv("data.tsv", type, function(error, data) {
						x.domain(data.map(function(d) { return d.tijd; }));
						y.domain([0, d3.max(data, function(d) { return d.waarde; })]);

					svg.append("g")
						.attr("class", "x axis")
						.attr("transform", "translate(0," + height + ")")
						.call(xAxis)
						.append("text")

					svg.append("g")
						.attr("class", "y axis")
						.call(yAxis)
						.append("text")
						.attr("transform", "rotate(-90)")
						.attr("y", 6)
						.attr("dy", ".71em")
						.style("text-anchor", "end")
						.text("PM10");

					svg.selectAll(".bar")
						.data(data)
						.enter().append("rect")
						.attr("class", "bar")
						.attr("x", function(d) { return x(d.tijd); })
						.attr("width", x.rangeBand())
						.attr("y", function(d) { return y(d.waarde); })
						.attr("height", function(d) { return height - y(d.waarde); });

					});

					function type(d) {
						d.waarde = +d.waarde;
						return d;
					}
*/

}

var getPopUpChartData = function(options) {
	// ajax call for data
	ajaxCallAireasPopUpChartGraphics(options, createPopUpChart)
}

var createPopUpChart = function(data, options) {
	var graphicDouble;
	graphicDouble = new ApriD3GraphicDouble();
	graphicDouble.createGraphic(data, options);
	graphicDouble.render();

//	options.url = "http://openiod.com/SCAPE604/openiod?SERVICE=WPS&REQUEST=Execute&identifier=observation_aireas_average&period=month&featureofinterest="+options.airbox+"&format=json";
	options.url = "http://openiod.com/SCAPE604/openiod?SERVICE=WPS&REQUEST=Execute&identifier=observation_aireas_average&featureofinterest="+options.airbox+"&avgType=all&histYear=all&histMonth=all&format=json";
	ajaxCall(options, createGraphicTrend);

//	options.url = "http://openiod.com/SCAPE604/openiod?SERVICE=WPS&REQUEST=Execute&identifier=observation_aireas_average&period=year&featureofinterest="+options.airbox+"&format=json";
	options.url = "http://openiod.com/SCAPE604/openiod?SERVICE=WPS&REQUEST=Execute&identifier=observation_aireas_average&featureofinterest="+options.airbox+"&avgType=all&histYear=all&format=json";
	ajaxCall(options, createGraphicGroupedHorBar);

}


//==================== ajax call for AiREAS measure data
	function ajaxCallAireasPopUpChartGraphics (options, callback) {

		var xmlhttp;
		xmlhttp=new XMLHttpRequest();

		//https://scapeler.com/TSCAP-550/data/aireas/getAllMeasures/10.cal
//		var url = APRI.getConfig().urlSystemRoot + "/data/aireas/getAllMeasures/" + options.locationCode;
//		var url = APRI.getConfig().urlSystemRoot + "/data/aireas/getLastWeekMeasures/" + options.locationCode;
		var url = siteAireas +"/data/aireas/getLastWeekMeasures/" + options.locationCode;

		xmlhttp.onreadystatechange=function() {
		    var i, inpRecord, outRecord, data=[];
//			var pm1min	= 0, pm1max		= 0, pm1maxdate;
//			var pm25min = 0, pm25max 	= 0, pm25maxdate;
  			if (xmlhttp.readyState==4 && xmlhttp.status==200) {
			    var jsonResponse = JSON.parse(xmlhttp.responseText);

				for(i=0;i<jsonResponse.length;i++) {
					inpRecord = jsonResponse[i];
					outRecord = {};
					//outRecord['date'] 	= new Date(inpRecord.retrieveddate).format("yyyymmdd");
					outRecord['date'] = inpRecord.retrieveddate;
					outRecord.pm1 	= inpRecord.pm1float;
					outRecord.pm25 	= inpRecord.pm25float;
					outRecord.pm10 	= inpRecord.pm10float;
					if (inpRecord.ufpfloat >0) {
						outRecord.ufp 	= inpRecord.ufpfloat;
					} else {
						//outRecord.ufp 	= 0;
					}
					//outRecord.ozon 	= inpRecord.ozonfloat;
					//outRecord.hum 	= inpRecord.humfloat;
					//outRecord.celc 	= inpRecord.celcfloat;
					//outRecord.no2 	= inpRecord.no2float;

//					if (outRecord.pm1 	< pm1min) 	pm1min 	= outRecord.pm1;
//					if (outRecord.pm1 	> pm1max) 	pm1max 	= outRecord.pm1, pm1maxdate = inpRecord.retrieveddate; //new Date(inpRecord.retrieveddate).format("yyyymmdd-h:m");
//					if (outRecord.pm25 	< pm25min) 	pm25min = outRecord.pm25;
//					if (outRecord.pm25 	> pm25max) 	pm25max = outRecord.pm25, pm25maxdate = inpRecord.retrieveddate; //new Date(inpRecord.retrieveddate).format("yyyymmdd-h:m");

					data.push(outRecord);
					//if (i>0) break;
				}
//				console.log('PM1\t: ' + pm1min + ' - ' + pm1max + ' ' + pm1maxdate);
//				console.log('PM25\t: ' + pm25min + ' - ' + pm25max + ' ' + pm25maxdate);

				callback(data, options);
			}
  		}
		xmlhttp.open("GET",url,true);
		xmlhttp.send();
	}







		aireasHistGridGemLayer = new L.geoJson(null, {
			  layerType:"aireasHistGridGemLayer"
			, avgType: aireasAvgType
			, style: function (feature) {
				var color="#000000";
				var fillOpacity = 0.4;
				var cr=0;
				var cy=0;
				var cg=0;
				var r = 0;
				var g = 0;
				var b = 0;
				///var valueRounded = Math.round(feature.properties.avg_pm_all_hr*10)/10;
				var valueRounded = feature.properties.avg_avg; //Math.round(feature.properties.avg_avg*10)/10;

//				var red=false, yellow=false, green=false;
//				if (valueRounded > 0 && valueRounded<7) green = true;
//				if (valueRounded >= 7 && valueRounded<10) yellow = true;
//				if (valueRounded >= 10) red = true;

/*
				if (valueRounded >= startA && valueRounded < startB) {
					color = scaleA(valueRounded);
					fillOpacity = 0.7; //0.6;
				}
				if (valueRounded >= startB && valueRounded < startC) {
					color = scaleB(valueRounded);
					fillOpacity = 0.8; //0.7;
				}
				if (valueRounded >= startC ) {
					color = scaleC(valueRounded);
					fillOpacity = 0.8; //0.8;
				}
*/

				color = aireasDomainsRanges[aireasAvgType].scale(valueRounded);

				if (valueRounded == 0) {
					fillOpacity = 0.1;
				} else {
					fillOpacity = 0.8 + (valueRounded%2)/10;  // domainGroups ; //0.8;
				}

				var opacity = 0.6; //line opacity
        		return {color: '#888', opacity:opacity, weight:1, fillColor:color, fillOpacity:fillOpacity};
    			}
			, onEachFeature:onEachAireasHistGridGemFeature
			, pointToLayer: function (feature, latlng) {
				return L.marker(latlng, { icon: trainIcon} );
				}
			, refreshData:true
			//, loadDataOnce:

		});

		function loadDataAireasHistGridGemLayer(layer, options) {
			//var _tmpDate1 = new Date(retrieveddatemax);

//			for (var i=0; i<retrievedDateCache.length;i++) {
//				var diff = retrievedDateCache[i].retrievedDateDate.getTime() - new Date(options.retrievedDateMax).getTime();
//				if (diff > -480000 && diff < 480000) {  //less than 9min = hit
//					retrievedDateMax = retrievedDateCache[i].retrievedDate;
//					//console.log('retrieveddate (cache/hit): ' + retrievedDateMax + ' '+options.retrievedDateMax);
//					window.setTimeout(function(){
//						layer.clearLayers();
//						layer.addData(retrievedDateCache[i].data);
//						layer.layerControl[0].setActiveDateTime(retrievedDateMax, '(cache)');  //timeSliderCtrl
//						if (options.next) {
//							var _newDate = new Date(new Date(retrievedDateMax).getTime()+ 600000);  // +10 minutes for next measure, no need for extra marge here
//							//console.log('retrieveddate next : ' + _newDate.toISOString());
//							playSliderMovie(layer, _newDate, options.avgType);
//						}
//					}, 200);
//					return;
//				}
//			}

//			var retrievedDatePlusMargeIso = new Date(new Date(options.retrievedDateMax).getTime()+60000).toISOString();

//			ajaxGetData(APRI.getConfig().urlSystemRoot +
			ajaxGetData( siteAireas +
				 "/data/aireas/getAireasHistGridGemInfo/*?hist_year=" +
				 options.hist_year + '&avgType=' + options.avgType ,
				function(data) {
					var _data = JSON.parse(data);
					if (_data.length == 0 ) return;
					var _hist_year = _data[0].properties.hist_year;

//					var _retrievedDateCacheRecord={};
//					_retrievedDateCacheRecord.data = _data;
//					_retrievedDateCacheRecord.retrievedDate = _retrievedDate;
//					_retrievedDateCacheRecord.retrievedDateDate = new Date(_retrievedDate);
//					retrievedDateCache.push(_retrievedDateCacheRecord);  // store in cache
					//console.log('retrieveddate (new cache): ' + _retrievedDate);


//					retrievedDateMax = _retrievedDate; //_retrievedDate?_retrievedDate:options.retrievedDateMax;
					layer.clearLayers();
					layer.addData(_data);
//					layer.layerControl[0].setActiveDateTime(_retrievedDateCacheRecord.retrievedDateDate, '(db)'); //timeSliderCtrl

//					if (options.next) {
//						var _newDate = new Date(new Date(options.retrievedDateMax).getTime()+ 600000);  // +10 minutes for next measure, no need for extra marge here
//						//console.log('retrieveddate next : ' + _newDate.toISOString());
//						window.setTimeout(function(){
//							playSliderMovie(layer, _newDate, options.avgType);
//						}, 200);
//					}
				}
			)
		}

        function onEachAireasHistGridGemFeature (feature, layer) {
            // does this feature have a property named popupContent?
            if (feature.properties && feature.properties.bu_naam) {
                layer.bindPopup(feature.properties.bu_naam +
				'<BR/><DIV style="width:132px;">------------------------</DIV>' +
				'<BR/>' + 'Leeftijd  0-14jr: ' + feature.properties.p_00_14_jr + '%' +
				'<BR/>' + 'Leeftijd 15-24jr: ' + feature.properties.p_15_24_jr + '%' +
				'<BR/>' + 'Leeftijd 25-44jr: ' + feature.properties.p_25_44_jr + '%' +
				'<BR/>' + 'Leeftijd 45-64jr: ' + feature.properties.p_45_64_jr + '%' +
				'<BR/>' + 'Leeftijd 65-e.o.: ' + feature.properties.p_65_eo_jr + '%');
            }


	// add text labels:
	if (feature.geometry.type == 'MultiPolygon') {
		for (var ix=0;ix<feature.geometry.coordinates.length;ix++) {
			var polygon = feature.geometry.coordinates[ix];
			var polBounds = L.latLngBounds(polygon);
			var polCenter = polBounds.getCenter();
//			feature.properties.labelPos = new L.LatLng(polygon[0][0][1], polygon[0][0][0]);
//			feature.properties.labelPos = new L.LatLng(polCenter);
			feature.properties.labelPos = new L.LatLng(polCenter.lng, polCenter.lat);
			feature.properties.labelTitle = new L.LabelOverlay(feature.properties.labelPos, '<b>'+feature.properties.avg_avg+'</b>');
    		map.addLayer(feature.properties.labelTitle);
		}
	} else {
	    feature.properties.labelPos = new L.LatLng(feature.geometry.coordinates[0][0][1], feature.geometry.coordinates[0][0][0]);
		feature.properties.labelTitle = new L.LabelOverlay(feature.properties.labelPos, '<b>'+feature.properties.avg_avg+'</b>');
		map.addLayer(feature.properties.labelTitle);
	}


    //var labelLocation2 = new L.LatLng(47.71329162782909, 13.34573480000006);
    //var labelTitle2 = new L.LabelOverlay(labelLocation2, '<b>AUSTRIA</b>');
    //map.addLayer(labelTitle2);

    // In order to prevent the text labels to "jump" when zooming in and out,
    // in Google Chrome, I added this event handler:

    map.on('movestart', function () {
        map.removeLayer(feature.properties.labelTitle);
    });
    map.on('moveend', function () {
        map.addLayer(feature.properties.labelTitle);
    });










			(function(layer, properties) {
				// Create a mouseover event
      			layer.on("mouseover", function (e) {

//					var _tmpDate = new Date(Date.parse(properties.retrieveddate));
//					var _dateFormatted = moment(_tmpDate).format('YYYY/MM/DD HH:mm'); //new Date(properties.avg_pm1_hr);
					var _data = [
						['Datum', properties.hist_year],
						[properties.avgType, properties.avg_avg]
					//	['PM1', properties.avg_pm1_hr],
					//	['PM2.5', properties.avg_pm25_hr],
					//	['PM10', properties.avg_pm10_hr],
					//	['PM Overall', properties.avg_pm_all_hr]
					]
					var _popupInfoCtrlTr = popupInfoCtrl
						.getTableContainer()
						//.append("table") // = d3.select('#'+popupInfoCtrl.id).select('.popupinfo-text');
						.selectAll('tr')
						.data(_data);

					_popupInfoCtrlTr
						.enter()
						.append("tr");
					_popupInfoCtrlTr
						.exit()
						.remove();

					var td = _popupInfoCtrlTr.selectAll("td")
						.data(function(d) {
							return d;
							});
					td
						.enter().append("td")
						.text(function(d) {
							return d;});
					td
						.exit()
						.remove();

						// .selectAll('.popupinfo-text');
					e.target.setStyle({
						//fillOpacity: 0.8,
						opacity: 0.8, color:'#000'
						});
        			// Change the style to the highlighted version
        	//		layer.setStyle(highlightStyle);
        			// Create a popup with a unique ID linked to this record
					var popup 	= document.createElement('div');
					popup.id 	= 'popup-x' + properties.cell_x + '-y' + properties.cell_y;
					popup.style.position = 'absolute';
					popup.style.bottom = '150px';
					popup.style.left = '140px';
					popup.style.zIndex = 1002;
					popup.style.backgroundColor = 'white';
					popup.style.padding = '8px';
					popup.style.border = '1px solid #ccc';
        			// Insert a headline into that popup
					var head = document.createElement('div');
					var _innerHtml = "<div>Jaar gemiddelde:</div>" + properties.hist_year + '<BR/>' + //todo
						properties.avg_type + ": " + properties.avg_avg;

//						"PM1: " + properties.avg_pm1_hr + '<BR/>' +
//						"PM2.5: " + properties.avg_pm25_hr + '<BR/>' +
//						"PM10: " + properties.avg_pm10_hr + '<BR/>' +
//						"PM All: " + properties.avg_pm_all_hr + '<BR/>' +
//						"cell: (" + properties.cell_x + ',' + properties.cell_y+ ')';
					//var textNode = document.createTextNode(_text);
					//head.appendChild(textNode);
					head.innerHTML = _innerHtml;
					head.style.fontSize = '14px';
					head.style.marginBottom = '3px';
					//head.appendTo(popup);
					popup.appendChild(head);

        			// Add the popup to the map
        			//popup.appendTo("#map");
//        			popup.appendTo("#"+this.apriFormContainerId + '-leafletjs-container');
        			//popup.appendTo("#"+map._container.id);

					//var container = document.getElementById("#"+map._container.id)
					mapPanes.popupPane.appendChild(popup);
				});
      			// Create a mouseout event that undoes the mouseover changes
      			layer.on("mouseout", function (e) {

					var _data = [
					]
					var _popupInfoCtrlTr = popupInfoCtrl
						.getTableContainer()
						//.append("table") // = d3.select('#'+popupInfoCtrl.id).select('.popupinfo-text');
						.selectAll('tr')
						.data(_data);
					_popupInfoCtrlTr
						.exit()
						.remove();
					//var _style = e.target.options.style(e.target.feature);

					//if (e.layer.resetStyle) {
					//	e.layer.resetStyle(e.target);
					//}
					e.target.setStyle({
						//fillOpacity: 0.8,
						opacity: 0.6, color:'#888'
					});

					//aireasGridGemLayer.resetStyle(e.target); //e.layer.options.style(e.target.feature));
        			// Start by reverting the style back
        	//		layer.setStyle(defaultStyle);
        			// And then destroying the popup
					document.getElementById('popup-x' + properties.cell_x + '-y' + properties.cell_y).remove();
      			});
      			// Close the "anonymous" wrapper function, and call it while passing
      			// in the variables necessary to make the events work the way we want.
			})(layer, feature.properties);
        }










		aireasGridGemStatisticsLayer = new L.geoJson(null, {
			  layerType:"aireasGridGemStatisticsLayer"
			, style: function (feature) {
				var color="#000000";
				var fillOpacity = 0.4;

//				if (feature.properties.pm_all_statistic < 6) {
					color = scaleStddevA(feature.properties.pm_all_statistic);
					fillOpacity = 0.6;
//				}
/*				if (feature.properties.pm_all_statistic == 6) {
					color = scaleStddevA(properties.pm_all_statistic);
					fillOpacity = 0.3;
				}
				if (feature.properties.pm_all_statistic > 6) {
					color = scaleStddevA(properties.pm_all_statistic);
					fillOpacity = 0.3;
				}
*/

				var opacity = 0.3; //line opacity
        		return {color: '#888', opacity:opacity, weight:1, fillColor:color, fillOpacity:fillOpacity};
    			}
			, onEachFeature:onEachAireasGridGemStatisticFeature
			, pointToLayer: function (feature, latlng) {
				return L.marker(latlng, { icon: trainIcon} );
				}
			, refreshData:true
			//, loadDataOnce:

		});

		function loadDataAireasGridGemStatisticsLayer(options) {


//			ajaxGetData(APRI.getConfig().urlSystemRoot +
			ajaxGetData(siteAireas +
				 "/data/aireas/getMeasureStatisticsStddev/*",
				function(data) {
					var _data = JSON.parse(data);

					var _record={};

					aireasGridGemStatisticsLayer.clearLayers();
					aireasGridGemStatisticsLayer.addData(_data);
				}
			)
		}

        function onEachAireasGridGemStatisticFeature (feature, layer) {
            // does this feature have a property named popupContent?
            if (feature.properties && feature.properties.pm_all_statistic) {
                layer.bindPopup(feature.properties.pm_all_statistic );
            }

			(function(layer, properties) {
				// Create a mouseover event
      			layer.on("mouseover", function (e) {

					var _data = [
						['PM Overall', properties.pm_all_statistic]
					]
					var _popupInfoCtrlTr = popupInfoCtrl
						.getTableContainer()
						//.append("table") // = d3.select('#'+popupInfoCtrl.id).select('.popupinfo-text');
						.selectAll('tr')
						.data(_data);

					_popupInfoCtrlTr
						.enter()
						.append("tr");
					_popupInfoCtrlTr
						.exit()
						.remove();

					var td = _popupInfoCtrlTr.selectAll("td")
						.data(function(d) {
							return d;
							});
					td
						.enter().append("td")
						.text(function(d) {
							return d;});
					td
						.exit()
						.remove();

						// .selectAll('.popupinfo-text');
					e.target.setStyle({
						//fillOpacity: 0.8,
						opacity: 0.8, color:'#000'
						});
        			// Change the style to the highlighted version
        	//		layer.setStyle(highlightStyle);
        			// Create a popup with a unique ID linked to this record
					var popup 	= document.createElement('div');
					popup.id 	= 'popup-' + properties.pm_all_statistic;
					popup.style.position = 'absolute';
					popup.style.bottom = '150px';
					popup.style.left = '140px';
					popup.style.zIndex = 1002;
					popup.style.backgroundColor = 'white';
					popup.style.padding = '8px';
					popup.style.border = '1px solid #ccc';
        			// Insert a headline into that popup
					var head = document.createElement('div');
					var _innerHtml =
						"PM All: " + properties.pm_all_statistic + '<BR/>';
					head.innerHTML = _innerHtml;
					head.style.fontSize = '14px';
					head.style.marginBottom = '3px';
					//head.appendTo(popup);
					popup.appendChild(head);

					mapPanes.popupPane.appendChild(popup);
				});
      			// Create a mouseout event that undoes the mouseover changes
      			layer.on("mouseout", function (e) {

					var _data = [
					]
					var _popupInfoCtrlTr = popupInfoCtrl
						.getTableContainer()
						//.append("table") // = d3.select('#'+popupInfoCtrl.id).select('.popupinfo-text');
						.selectAll('tr')
						.data(_data);
					_popupInfoCtrlTr
						.exit()
						.remove();
					//var _style = e.target.options.style(e.target.feature);
					aireasGridGemStatisticsLayer.resetStyle(e.target); //e.layer.options.style(e.target.feature));
        			// Start by reverting the style back
        	//		layer.setStyle(defaultStyle);
        			// And then destroying the popup
					var popUpElement = document.getElementById('popup-' + properties.pm_all_statistic);
					if (popUpElement) popUpElement.remove();
      			});
      			// Close the "anonymous" wrapper function, and call it while passing
      			// in the variables necessary to make the events work the way we want.
			})(layer, feature.properties);
        }


		aireasGridGemStatisticsAvgLayer = new L.geoJson(null, {
			  layerType:"aireasGridGemStatisticsAvgLayer"
			, style: function (feature) {
				var color="#000000";
				var fillOpacity = 0.4;


//					color = scaleAvgA(feature.properties.pm_all_statistic);
//					fillOpacity = 0.6;

				var valueRounded = Math.round(feature.properties.pm_all_statistic*10)/10;

/*
				if (valueRounded >= startA && valueRounded < startB) {
					color = scaleA(valueRounded);
					fillOpacity = 0.7; //0.6;
				}
				if (valueRounded >= startB && valueRounded < startC) {
					color = scaleB(valueRounded);
					fillOpacity = 0.8; //0.7;
				}
				if (valueRounded >= startC ) {
					color = scaleC(valueRounded);
					fillOpacity = 0.8; //0.8;
				}
*/
				var opacity = 0.3; //line opacity
        		return {color: '#888', opacity:opacity, weight:1, fillColor:color, fillOpacity:fillOpacity};
    			}
			, onEachFeature:onEachAireasGridGemStatisticAvgFeature
			, pointToLayer: function (feature, latlng) {
				return L.marker(latlng, { icon: trainIcon} );
				}
			, refreshData:true
			//, loadDataOnce:

		});

		function loadDataAireasGridGemStatisticsAvgLayer(options) {

//			ajaxGetData(APRI.getConfig().urlSystemRoot +
			ajaxGetData(siteAireas +
				 "/data/aireas/getMeasureStatisticsAvg/*",
				function(data) {
					var _data = JSON.parse(data);

					var _record={};

					aireasGridGemStatisticsAvgLayer.clearLayers();
					aireasGridGemStatisticsAvgLayer.addData(_data);
				}
			)
		}

        function onEachAireasGridGemStatisticAvgFeature (feature, layer) {
            // does this feature have a property named popupContent?
            if (feature.properties && feature.properties.pm_all_statistic) {
                layer.bindPopup(feature.properties.pm_all_statistic );
            }

			(function(layer, properties) {
				// Create a mouseover event
      			layer.on("mouseover", function (e) {

					var _data = [
						['PM Overall', properties.pm_all_statistic]
					]
					var _popupInfoCtrlTr = popupInfoCtrl
						.getTableContainer()
						//.append("table") // = d3.select('#'+popupInfoCtrl.id).select('.popupinfo-text');
						.selectAll('tr')
						.data(_data);

					_popupInfoCtrlTr
						.enter()
						.append("tr");
					_popupInfoCtrlTr
						.exit()
						.remove();

					var td = _popupInfoCtrlTr.selectAll("td")
						.data(function(d) {
							return d;
							});
					td
						.enter().append("td")
						.text(function(d) {
							return d;});
					td
						.exit()
						.remove();

						// .selectAll('.popupinfo-text');
					e.target.setStyle({
						//fillOpacity: 0.8,
						opacity: 0.8, color:'#000'
						});
        			// Change the style to the highlighted version
        	//		layer.setStyle(highlightStyle);
        			// Create a popup with a unique ID linked to this record
					var popup 	= document.createElement('div');
					popup.id 	= 'popup-' + properties.pm_all_statistic;
					popup.style.position = 'absolute';
					popup.style.bottom = '150px';
					popup.style.left = '140px';
					popup.style.zIndex = 1002;
					popup.style.backgroundColor = 'white';
					popup.style.padding = '8px';
					popup.style.border = '1px solid #ccc';
        			// Insert a headline into that popup
					var head = document.createElement('div');
					var _innerHtml =
						"PM All: " + properties.pm_all_statistic + '<BR/>';
					head.innerHTML = _innerHtml;
					head.style.fontSize = '14px';
					head.style.marginBottom = '3px';
					//head.appendTo(popup);
					popup.appendChild(head);

					mapPanes.popupPane.appendChild(popup);
				});
      			// Create a mouseout event that undoes the mouseover changes
      			layer.on("mouseout", function (e) {

					var _data = [
					]
					var _popupInfoCtrlTr = popupInfoCtrl
						.getTableContainer()
						//.append("table") // = d3.select('#'+popupInfoCtrl.id).select('.popupinfo-text');
						.selectAll('tr')
						.data(_data);
					_popupInfoCtrlTr
						.exit()
						.remove();
					//var _style = e.target.options.style(e.target.feature);
					aireasGridGemStatisticsAvgLayer.resetStyle(e.target); //e.layer.options.style(e.target.feature));
        			// Start by reverting the style back
        	//		layer.setStyle(defaultStyle);
        			// And then destroying the popup
					document.getElementById('popup-' + properties.pm_all_statistic).remove();
      			});
      			// Close the "anonymous" wrapper function, and call it while passing
      			// in the variables necessary to make the events work the way we want.
			})(layer, feature.properties);
        }


//http://scapeler.com/SCAPE604/data/nsl/getMeasures/*

		nslMeasuresInfoLayer = new L.geoJson(null, {
			  layerType:"nslMeasuresInfoLayer"
			, style: function (feature) {
				var color="#000000";
				var fillOpacity = 0.03;

//				if (feature.properties.pm_all_statistic < 6) {
//					color = scaleAvgA(feature.properties.pm_all_statistic);
//					fillOpacity = 0.6;
//				}
/*				if (feature.properties.pm_all_statistic == 6) {
					color = scaleStddevA(properties.pm_all_statistic);
					fillOpacity = 0.3;
				}
				if (feature.properties.pm_all_statistic > 6) {
					color = scaleStddevA(properties.pm_all_statistic);
					fillOpacity = 0.3;
				}
*/

				var opacity = 0.3; //line opacity
        		return {color: '#888', opacity:opacity, weight:1, fillColor:color, fillOpacity:fillOpacity};
    			}
			, onEachFeature:onEachNslMeasuresInfoFeature
			, pointToLayer: function (feature, latlng) {
				return L.marker(latlng, {} );
				}
			//, refreshData:true
			//, loadDataOnce:

		});
		nslMeasuresInfoLayer.refreshData = true;

		function loadDataNslMeasuresInfoLayer(options) {

//			ajaxGetData(APRI.getConfig().urlSystemRoot +
			ajaxGetData(siteAireas +
				 "/data/nsl/getNslMeasuresInfo/*",
				function(data) {
					var _data = JSON.parse(data);

					nslMeasuresInfoLayer.clearLayers();
					nslMeasuresInfoLayer.layerControl.clearControl();
					nslMeasuresInfoLayer.layerControl.fillControl(_data);
					nslMeasuresInfoLayer.addData(_data);
				}
			)
		}

        function onEachNslMeasuresInfoFeature (feature, layer) {
            // does this feature have a property named popupContent?
            if (feature.properties && feature.properties.naam) {
                layer.bindPopup(feature.properties.naam + ' ' + feature.properties.stof + ' ' + feature.properties.factor);
            }

			(function(layer, properties) {
				// Create a mouseover event
      			layer.on("mouseover", function (e) {
					this.openPopup();
					console.log('nslMeasuresInfoLayer mouseover');
				});
      			// Create a mouseout event that undoes the mouseover changes
      			layer.on("mouseout", function (e) {
					if (this.closePopup) this.closePopup();
					else this.invoke('closePopup');  //bug when multipolygon
      			});
      			// Close the "anonymous" wrapper function, and call it while passing
      			// in the variables necessary to make the events work the way we want.
			})(layer, feature.properties);
        }




//http://scapeler.com/SCAPE604/data/nsl/getResultInfo/*

		nslResultInfoLayer = new L.geoJson(null, {
			  layerType:"nslResultInfoLayer"
			, style: function (feature) {
				var color="#000000";
				var fillOpacity = 0.03;

//				if (feature.properties.pm_all_statistic < 6) {
//					color = scaleAvgA(feature.properties.pm_all_statistic);
//					fillOpacity = 0.6;
//				}
/*				if (feature.properties.pm_all_statistic == 6) {
					color = scaleStddevA(properties.pm_all_statistic);
					fillOpacity = 0.3;
				}
				if (feature.properties.pm_all_statistic > 6) {
					color = scaleStddevA(properties.pm_all_statistic);
					fillOpacity = 0.3;
				}
*/

				var opacity = 0.3; //line opacity
        		return {color: '#888', opacity:opacity, weight:1, fillColor:color, fillOpacity:fillOpacity};
    			}
			, onEachFeature:onEachNslResultInfoFeature
			, pointToLayer: function (feature, latlng) {
				return L.marker(latlng, {} );
				}
			//, refreshData:true
			//, loadDataOnce:

		});
		nslResultInfoLayer.refreshData = true;

		function loadDataNslResultInfoLayer(options) {

//			ajaxGetData(APRI.getConfig().urlSystemRoot +
			ajaxGetData(siteAireas +
				 "/data/nsl/getNslResultInfo/*",
				function(data) {
					var _data = JSON.parse(data);

					nslResultInfoLayer.clearLayers();
					nslResultInfoLayer.layerControl.clearControl();
					nslResultInfoLayer.layerControl.fillControl(_data);
					nslResultInfoLayer.addData(_data);
				}
			)
		}

        function onEachNslResultInfoFeature (feature, layer) {
            // does this feature have a property named popupContent?
            if (feature.properties && feature.properties.naam) {
                layer.bindPopup(feature.properties.naam + ' ' + feature.properties.stof + ' ' + feature.properties.factor);
            }

			(function(layer, properties) {
				// Create a mouseover event
      			layer.on("mouseover", function (e) {
					this.openPopup();
					console.log('nslResultInfoLayer mouseover');
				});
      			// Create a mouseout event that undoes the mouseover changes
      			layer.on("mouseout", function (e) {
					if (this.closePopup) this.closePopup();
					else this.invoke('closePopup');  //bug when multipolygon
      			});
      			// Close the "anonymous" wrapper function, and call it while passing
      			// in the variables necessary to make the events work the way we want.
			})(layer, feature.properties);
        }




//http://scapeler.com/SCAPE604/data/nsl/getResultSpmiAvgInfo/*

		nslResultSpmiAvgInfoLayer = new L.geoJson(null, {
			  layerType:"nslResultSpmiAvgInfoLayer"
			, style: function (feature) {
				var color="#555555";
				var fillOpacity = 0.4;

				var valueRounded = Math.round(feature.properties.spmi_avg*10)/10;

/*
				if (valueRounded >= startA && valueRounded < startB) {
					color = scaleA(valueRounded);
					fillOpacity = 0.7; //0.6;
				}
				if (valueRounded >= startB && valueRounded < startC) {
					color = scaleB(valueRounded);
					fillOpacity = 0.8; //0.7;
				}
				if (valueRounded >= startC ) {
					color = scaleC(valueRounded);
					fillOpacity = 0.8; //0.8;
				}
*/

				var opacity = 0.3; //line opacity
        		return {color: '#888', opacity:opacity, weight:1, fillColor:color, fillOpacity:fillOpacity};
    			}
			, onEachFeature:onEachNslResultSpmiAvgInfoFeature
			//, refreshData:true
			//, loadDataOnce:

		});
		nslResultSpmiAvgInfoLayer.refreshData = true;

		function loadDataNslResultSpmiAvgInfoLayer(options) {

//			ajaxGetData(APRI.getConfig().urlSystemRoot +
			ajaxGetData(siteAireas +
				 "/data/nsl/getNslResultSpmiAvgInfo/*?rekenjaar=2013",
				function(data) {
					var _data = JSON.parse(data);

					nslResultSpmiAvgInfoLayer.clearLayers();
					nslResultSpmiAvgInfoLayer.layerControl.clearControl();
					nslResultSpmiAvgInfoLayer.layerControl.fillControl(_data);
					nslResultSpmiAvgInfoLayer.addData(_data);
				}
			)
		}

        function onEachNslResultSpmiAvgInfoFeature (feature, layer) {
            // does this feature have a property named popupContent?
            if (feature.properties && feature.properties.spmi_avg) {
                layer.bindPopup('SPMI: ' + feature.properties.spmi_avg );
            }

			(function(layer, properties) {
				// Create a mouseover event
      			layer.on("mouseover", function (e) {
					this.openPopup();
					console.log('nslResultSpmiAvgInfoLayer mouseover');
				});
      			// Create a mouseout event that undoes the mouseover changes
      			layer.on("mouseout", function (e) {
					if (this.closePopup) this.closePopup();
					else this.invoke('closePopup');  //bug when multipolygon
      			});
      			// Close the "anonymous" wrapper function, and call it while passing
      			// in the variables necessary to make the events work the way we want.
			})(layer, feature.properties);
        }







//http://scapeler.com/TSCAP-550/data/gtfs/getStopsInRange/*

		gtfsStopsInRangeInfoLayer = new L.geoJson(null, {
			  layerType:"gtfsStopsInRangeInfoLayer"
			, style: function (feature) {
				var color="#000000";
				var fillOpacity = 0.03;

				var opacity = 0.3; //line opacity
        		return {color: '#888', opacity:opacity, weight:1, fillColor:color, fillOpacity:fillOpacity};
    			}
			, onEachFeature:onEachGtfsStopsInRangeInfoFeature
			, pointToLayer: function (feature, latlng) {
				return L.marker(latlng, {} );;
				}
			//, refreshData:true
			//, loadDataOnce:

		});
		gtfsStopsInRangeInfoLayer.refreshData = true;

		function loadDataGtfsStopsInRangeInfoLayer(options) {

			ajaxGetData(APRI.getConfig().urlSystemRoot +
				 "/data/gtfs/getStopsInRangeInfo/*",
				function(data) {
					var _data = JSON.parse(data);

					gtfsStopsInRangeInfoLayer.clearLayers();
					gtfsStopsInRangeInfoLayer.layerControl.clearControl();
					gtfsStopsInRangeInfoLayer.layerControl.fillControl(_data);
					gtfsStopsInRangeInfoLayer.addData(_data);
				}
			)
		}

        function onEachGtfsStopsInRangeInfoFeature (feature, layer) {
            // does this feature have a property named popupContent?
            if (feature.properties && feature.properties.stop_sequence) {
                layer.bindPopup('<br/>==============================================<br/>' + feature.properties.agency_id + '<br/>Lijn: ' + feature.properties.route_short_name + ' ' + feature.properties.route_long_name + ' <br/>halte:' + feature.properties.stop_name + ' <br/>Rit: ' + feature.properties.trip_headsign + ' <br/>Vertrektijd: ' + feature.properties.dep_time + ' <br/>Haltevolgnummer: ' + feature.properties.stop_sequence);
            }

			gtfsOms.addMarker(layer);

			(function(layer, properties) {
				// Create a mouseover event
      			layer.on("mouseover", function (e) {
					this.openPopup();
					console.log('gtfsStopsInRangeInfoLayer mouseover');
				});
      			// Create a mouseout event that undoes the mouseover changes
      			layer.on("mouseout", function (e) {
					if (this.closePopup) this.closePopup();
					else this.invoke('closePopup');  //bug when multipolygon
      			});
      			// Close the "anonymous" wrapper function, and call it while passing
      			// in the variables necessary to make the events work the way we want.
			})(layer, feature.properties);
        }


	function ajaxGetData(url, callback ) {
		var xmlhttp;
		xmlhttp=new XMLHttpRequest();
		xmlhttp.onreadystatechange=function() {
  			if (xmlhttp.readyState==4 && xmlhttp.status==200) {
				callback(xmlhttp.responseText);
			}
  		}
		xmlhttp.open("GET",url,true);
		xmlhttp.send();
	}

/*
	var initCbsGridGemLayer = function(cityName) {
		cbsGridGemLayer = new L.geoJson(null, {
			  layerType:"cbsGridGemLayer"
			, style: function (feature) {
				var color="#000000";
				var fillOpacity = 0;
				var opacity = 0.8; //line opacity
        		return {color: color, opacity:opacity, weight:1, fillColor:color, fillOpacity:fillOpacity};
    			}
		//	, onEachFeature:onEachCbsGridGemFeature
			, pointToLayer: function (feature, latlng) {
				return L.marker(latlng, { icon: trainIcon} );
				}
			, refreshData:true
			, loadDataOnce:
				function () {
//					ajaxGetData2(APRI.getConfig().urlSystemRoot + "/data/aireas/getCbsGemInfo/*",
					ajaxGetData2(siteAireas + "/data/aireas/getCbsGemInfo/*?gm_naam=" + cityName,  // "Eindhoven",
						function(data) {
							var _data = JSON.parse(data)
							cbsGridGemLayer.addData(_data);
							var _dataEnvelope = {};
							_dataEnvelope.geometry =_data[0].envelope;
							_dataEnvelope.type = 'Feature';
							_dataEnvelope.properties = _data[0].properties;
							var _dataCentroid = {};
							_dataCentroid.geometry =_data[0].centroid;
							initCbsGridGemEnvelopeLayer(_dataEnvelope, _dataCentroid);
							//var eindhovenLatLng = L.latLng( 51.43881, 5.48046 );
								//	L.marker(eindhovenLatLng, { icon: trainIcon} ).addTo(map);
							//map.panTo(eindhovenLatLng);
						}
					)
            	}
		});
	}
*/

	var initCbsGridGemEnvelopeLayer = function(layer, areaIndex, geom, centroid) {

		var _areaIndex = areaIndex;
		console.log('Function: areaLayerMenuMouseEnter: ', ' Index', _areaIndex );
		activateAreaLayerMenu(_areaIndex);

		var _layer = areas[areaIndex].areaLayer[layer.name].object;
		_layer.addData(geom);


/*
		cbsGridGemEnvelopeLayer = new L.geoJson(geom, {
			  layerType:"cbsGridGemEnvelopeLayer"
			, style: function (feature) {
				var color="#000000";
				var fillOpacity = 0;
				var opacity = 0.2; //line opacity
        		return {transform:"scale(2)", color: color, opacity:opacity, weight:4, fillColor:color, fillOpacity:fillOpacity};
    			}
//			, pointToLayer: function (feature, latlng) {
//				return L.marker(latlng, { icon: trainIcon} );
//				}
		});
*/
		var _bounds = _layer.getBounds();

//		var _boundsPlus = _bounds;
//		_boundsPlus._northEast.lat = _boundsPlus._northEast.lat + 1.23;
//		_boundsPlus._northEast.lng = _boundsPlus._northEast.lng + 1.29;
//		_boundsPlus._southWest.lat = _boundsPlus._southWest.lat - 1.26;
//		_boundsPlus._southWest.lng = _boundsPlus._southWest.lng - 1.38;


		// pan to centroid
		//newCenter.lat = Math.round(newCenter.lat*1000)/1000;
		//newCenter.lng = Math.round(newCenter.lng*1000)/1000;
		map.panTo([centroid.geometry.coordinates[1],centroid.geometry.coordinates[0]]);

		//overrule the standaard leaflet function because of swabling map
		map.panInsideBounds = function (bounds, options) {
//			var center = this.getCenter(),
//				newCenter = this._limitCenter(center, this._zoom, bounds);

//			if (center.equals(newCenter)) { return this; }

			// rounding did the trick :-)
//			newCenter.lat = Math.round(newCenter.lat*1000)/1000;
//			newCenter.lng = Math.round(newCenter.lng*1000)/1000;

//			return this.panTo(newCenter, options);
		};


//		map.setMaxBounds(_bounds);
	//	var _zoom = map.getZoom();
	//	map.options.minZoom = _zoom;
		map.options.minZoom = 4;
		//map.fitBounds(_bounds.pad(-0.98));

		//cbsGridGemEnvelopeLayer.addTo(map);

	}



	function ajaxGetData2(url, callback ) {
		var xmlhttp;
		xmlhttp=new XMLHttpRequest();
		xmlhttp.onreadystatechange=function() {
  			if (xmlhttp.readyState==4 && xmlhttp.status==200) {
				callback(xmlhttp.responseText);
			}
  		}
		xmlhttp.open("GET",url,true);
		xmlhttp.send();
	};


	function initLayerCtrl(options) {
		var layerCtrl = new ApriLeafLetCtrlBase();
		layerCtrl.initControl(options);
		return layerCtrl;
	};


	function initPopupInfoCtrl() {
		popupInfoCtrl = new ApriLeafLetCtrlPopupInfo();
	};

	function initTimeSliderCtrl(options) {
		console.log('initTimeSliderCtrl ' + options.layer.options.properties.avgType );
		var layerCtrl = new ApriLeafLetCtrlTimeSlider(options);
		return layerCtrl;
	};

	function initTimeLineCtrl(options) {
		var layerCtrl = new ApriLeafLetCtrlTimeLine(options)
			.stack()
			.margin({left:100, right:0, top:40, bottom:0})
			.rowSeparators('rgba(0,0,0,0.1)')
			//.showTimeAxis()
			.showTimeAxisTick()
			.showTimeAxisTickFormat({
//				  stroke: "solid"
				  stroke: "stroke-dasharray"
				, spacing: "1 4"
				//?, "stroke-opacity": 0.1
				//, marginTop: 25
				//, marginBottom: 0
				, width: 1
				//, color: colorCycle
			})
			//.showAxisTop()
			//.showAxisHeaderBackground()
			;
		return layerCtrl;
	};

	function initLegendCtrl(options) {
		var layerCtrl = new ApriD3Legend(options);
		return layerCtrl;
	};

	function initThreeBase() {
		threeScene = new ApriThreeBase();
	};

	function initWebGlBase() {
		webGlContext = new ApriWebGlBase();
	};


	function playSliderMovie(layer, startDate, avgType) {
		var next=false;
		if (layer.options.properties.timeSpan == undefined) layer.options.properties.timeSpan =0;
		if (startDate.getTime() > new Date().getTime()-layer.options.properties.timeSpan) next = false
		else next = true;
		//var _date = new Date(startDate.getTime()+60000); //plus 1 minute extra time for retrieveddate marge
		//retrievedDateMax = _date; //new Date(retrievedDateMax.getTime() - 600000+5000); // 10 minuten in tijd terug met 5 sec. speelruimte.
		//var _date1 = formatLocalDate(retrievedDateMax);
		var _dateISO = startDate.toISOString();
		layer.options.properties.retrievedDateMax = _dateISO;
		layer.options.next = next;
		if (next) {
			layer.options.loadData(layer, layer.options);
			//loadDataAireasGridGemLayer(layer, {retrievedDateMax: _dateISO, avgType: avgType, next:next });
			if (movieLayers['heatmapTrafficFlowLayer']) {
				movieLayers['heatmapTrafficFlowLayer'].layer.options.loadDataTrafficFlowLayer(movieLayers['heatmapTrafficFlowLayer'].layer, {retrievedDateMax: _dateISO});
			}
		}
	};

	function initLayersControl() {
		baseMaps = {
			//  "OpenStreetMap": aireasTileLayer
			 "OpenBasisKaart": openBasisKaartLayer
			, "Luchtfoto PDOK": pdokLuchtfotoLayer
			, "OSMDE":osmKaartLayer
           //       , "Luchtfoto Aster2012": Aster_Luchtfoto_Layer
          //        , "Luchtfoto dkln2006": dkln2006_Luchtfoto_Layer
  //              , "Luchtfoto": PDOK_Luchtfoto_Layer
		};



		var ehvOverlayMaps = {
			"EHV Oplaadpalen": EHV_OplaadPalen_Layer,
			"EHV Beeldbepalend groen": EHV_BeeldBepalendGroen_Layer,
			"EHV Bomen": EHV_Bomen_Layer,
			"EHV Luchtkwaliteit": EHV_Luchtkwaliteit_Layer,
			"EHV Faunapoelen": EHV_FaunaPoelen_Layer,
			"EHV Landschap": EHV_Landschap_Layer,
			"EHV Stedebouw": EHV_StedebouwkundigGebied_Layer,
			"EHV Wegenstructuur": EHV_Wegenstructuur_Layer,
			"EHV Vergunningen": EHV_Vergunningen_Layer,
			"EHV Lichtmast wijk": EHV_Lichtmasten_Layer
		};
		L.control.layers(null, ehvOverlayMaps).addTo(map);

		var rtdOverlayMaps = {
			"RTD Spelen": RTD_Spelen_Layer,
			"RTD Speelplaatsen": RTD_SpeelPlaatsen_Layer,
			"RTD BR Onderhoud": RTD_BROnderhoud_Layer,
			"RTD Bomen": RTD_Bomen_Layer,
			"RTD Bouwplaatsen": RTD_BouwPlaatsen_Layer,
			"RTD Verkeersborden": RTD_Verkeersborden_Layer,
			"RTD Straatnaamborden": RTD_StrNaamBorden_Layer,
			"RTD Plantsoenen": RTD_Plantsoenen_Layer,
			"RTD Lichtmasten": RTD_Lichtmasten_Layer
		};
		L.control.layers(null, rtdOverlayMaps).addTo(map);

		var arhOverlayMaps = {
			"ARH Bossen": ARH_Bossen_Layer,
			"ARH Tuinen": ARH_Tuinen_Layer,
			"ARH Parken": ARH_Parken_Layer,
			"ARH WrdVBomen contrl": ARH_BomenWVControle_Layer,
			"ARH WrdVBomen beschermd": ARH_BomenWVBeschermd_Layer,
			"ARH WrdVBomen": ARH_BomenWV_Layer,
			"ARH Restgroen": ARH_Restgroen_Layer,
			"ARH Klimaatzones": ARH_KlimaatZones_Layer,
			"ARH Klimaatzones lijn": ARH_KlimaatZonesL_Layer,
			"ARH Klimaatzones punt": ARH_KlimaatZonesP_Layer,
			"ARH Afval Kunststof": ARH_AfvalKunststof_Layer,
			"ARH Afval Glas": ARH_AfvalGlas_Layer,
			"ARH Afval Restafval": ARH_AfvalRestafval_Layer,
			"ARH Afval Papier": ARH_AfvalPapier_Layer,
			"ARH Afval Textiel": ARH_AfvalTextiel_Layer
		};
		L.control.layers(null, arhOverlayMaps).addTo(map);


/*
		var overlayMapsEnergie = {
//			"fijnstof": heatmapPM1Layer,
			"Energie ELK": heatmapELKLayer,
			"Energie ELK toename": heatmapELKDeltaMore20132014Layer,
			"Energie ELK afname": heatmapELKDeltaLess20132014Layer,
			"Energie ELK teruglevering": heatmapELKRichtingPrc20132014Layer,
			"Energie ELK toename teruglevering": heatmapELKDeltaRichtingPrc20132014Layer,
			"Energie GAS": heatmapGASLayer,
			"Energie GAS toename": heatmapGASDeltaMore20132014Layer,
			"Energie GAS afname": heatmapGASDeltaLess20132014Layer
		};
		L.control.layers(null, overlayMapsEnergie).addTo(map);
*/

		var overlayNsl = {
			"NSL segment EHV jr2012": nslSegmentEindhovenWMSLayer,
			"NSL receptor EHV jr2012": nslReceptorEindhovenWMSLayer,
			"NSL result EHV jr2012": nslResultEindhovenWMSLayer,
			"NSL measure EHV jr2012": nslMeasureEindhovenWMSLayer,
			"NSL maatregelen jr2013": nslMeasuresInfoLayer,
			"NSL Resultaat   jr2013": nslResultInfoLayer,
			"NSL Resultaat SPMI jr2013": nslResultSpmiAvgInfoLayer
		};
		L.control.layers(null, overlayNsl).addTo(map);

		var overlayOv = {
    		"Treinstations": nsStationsLayer,
//    		"Power plants": powerPlantsLayer,
			"OV Stops in Range": gtfsStopsInRangeInfoLayer,
			"OV Stops": ovStopsWMSLayer,
			"OV Shapes": ovShapesWMSLayer
		};
		L.control.layers(null, overlayOv).addTo(map);

		var overlayMaps = {
			"Aardbevingen GBB": aardbevingenLocationsLayer,
//			"Trafficflow heatmap": heatmapTrafficFlowLayer,
		//	"Trafficspeed heatmap": heatmapTrafficSpeedLayer,
			"NDW Traffic Flow ": ndwTrafficFlowLayer,
			"NDW Traffic Speed": ndwTrafficSpeedLayer,
//			"NDW Traffic Speed Test": ndwTrafficSpeedLayerTest,
	//		"KNMI": KNMI_Layer,
			"Oplossingen": solutionsLayer,
			"Participatie": participationLayer,
			"Lokale producten": localProductsLayer,
			"Parkeren en Reizen": parkingLayer,
			"BAG Pand": PDOK_BAG_pand_Layer,
    		"BAG Verblijfsobject": PDOK_BAG_verblijfsobject_Layer,
			"Videocamera": videoCameraLayer,
			"Biomassa centrale": bioMassaCentraleEindhovenLayer,
			"Project Airport":projectAirportLayer,

			"NWB Hectopunten": nwbWegHectoPuntenLayer,
			"NWB Wegvakken": nwbWegVakkenLayer,

//          "CultGIS Elementen": CultGIS_elementen_Layer,
//            "NOK2013 Planologische ehs": NOK2013_planologischeehs_Layer,
//            "Natura2000": Natura2000_Layer,

//    		"Gem.Structuurvisieplangebied": Structuurvisieplangebied_G_Layer,
//    		"ROO Plangebied": Plangebied_ROO_Layer,
    		"AHN1 5m": Ahn1_5m_Layer,
			"Drone NoFlyZone Luchtvaart": droneNoFlyZoneLuchtvaartLayer,
			"Drone NoFlyZone Landingsite": droneNoFlyZoneLandingsiteLayer,
			"Agrarisch arsenaal NL": AANLayer
//    		"AHN1 stadspolygonen": Ahn1_stadspolygonen_Layer
		};
		L.control.layers(baseMaps, overlayMaps).addTo(map);

		var cbsOverlayMaps = {
			"CBS Buurt info": cbsBuurtInfoLayer,
			"CBS Buurt Rook info": cbsBuurtRookRisicoInfoLayer,
			"CBS Buurt project EHV Airport": cbsBuurtProjectEhvAirportLayer
		};
		L.control.layers(null, cbsOverlayMaps).addTo(map);

//		aireasBaseMaps = {
//    		"Luchtkwaliteit": areas[0].layers['aireasGridGemLayer'].object,  //aireasGridGemLayer,
//    		"Luchtkwaliteit stddev": aireasGridGemStatisticsLayer,
//    		"Luchtkwaliteit average": aireasGridGemStatisticsAvgLayer
//		};
		var aireasOverlayMaps = {
			"AiREAS 2014 avg": aireasHistGridGemLayer
			//,"AiREAS meetkasten": aireasMeetkastenLayer
		};
//		L.control.layers(aireasBaseMaps, aireasOverlayMaps).addTo(map);
		L.control.layers(null, aireasOverlayMaps).addTo(map);

		var overlayBestemmingsplannen = {
    		"Bst.plan Enkelbestemming": EnkelbestemmingLayer,
    		"Bst.plan Dubbelbestemming": DubbelbestemmingLayer,
            "Bestemmingsplangebied": BestemmingsplangebiedLayer,
    		"Bst.plan Bouwvlak": BouwvlakLayer,
    		"Bst.plan Gebiedsaanduiding": GebiedsaanduidingLayer
		};
		L.control.layers(null, overlayBestemmingsplannen).addTo(map);

		var overlayAlterra = {
			"Alterra PM10 Invang 2014-11": dankPm10InvangWMSLayer,
			"Alterra Wandelaanbod": dankWandelWMSLayer,
			"Alterra Fietsaanbod": dankFietsWMSLayer,
			"Alterra Landbeleving": dankLandBelevingWMSLayer,
			"Alterra Bodemmaatreg C totaal": dankBodemMaatregelCTotaalWMSLayer,
			"Alterra Bomenkaart": dankBomenWMSLayer,
			"Alterra Biomassa houtvoorraad": dankBiomassaHoutvoorraadWMSLayer,
			"Alterra Boomhoogte": dankBoomHoogteWMSLayer,
			"Alterra Biomassa tak/top": dankBiomassaTakTopSnoeiWMSLayer,
			"Alterra Warmtedaling": dankWarmteDalingWMSLayer
		};
		L.control.layers(null, overlayAlterra).addTo(map);

	}


/*
	var activateLayers = function(layers) {
		if (layers == undefined) return;
//		for (var i=0;i<layers.length;i++) {
//			map.addLayer(layers[i]);
//		}
	}
*/





var uStreamHtml = '<div class="clearfix"> \
<!--        <div style="width: 360px; float: left; margin-bottom: 100px; margin-right: 10px;"> -->\
        <div> \
            <div style="padding: 20px 0;" id="StatusAlpha"> \
                <span style="display: none;" class="st-live label label-important">LIVE</span> \
                <span style="display: none;" class="st-offline label ">OFFLINE</span> \
                <span style="display: none;" class="st-playing label label-info">PLAYING</span> \
                <span style="display: none;" class="st-ended label label-success">ENDED</span> \
            </div> \
            <div class="well " > \
          <!--      <iframe src="http://www.ustream.tv/channel/18668654" id="FrameAlpha" width="320" height="213" style="border: 0 transparent none;"></iframe> --> \
				<iframe id="FrameAlpha" width="480" height="302" src="http://www.ustream.tv/embed/18668654?v=3&amp;wmode=direct" scrolling="no" frameborder="0" style="border: 0px none transparent;">    </iframe> \
<br /><a href="http://www.ustream.tv" style="font-size: 12px; line-height: 20px; font-weight: normal; text-align: left;" target="_blank">Broadcast live streaming video on Ustream</a> \
            </div> \
<!--            <form class="form-inline" action="#"> \
                <fieldset style="margin: 0 20px; float: left; width: 200px;"> \
                    <div id="PlayAlpha" class="btn btn-success control-play"><i class="icon-play"></i> Play</div> \
                    <div id="PauseAlpha" class="btn control-pause"><i class="icon-pause"></i> Pause</div> \
                </fieldset> \
            </form> \
-->        </div> \
    </div>';

//                <iframe src="http://www.ustream.tv/embed/1524" id="FrameAlpha" width="320" height="213" style="border: 0 transparent none;"></iframe> \

//http://oembed.com/
// http://www.ustream.tv/oembed?url=http://www.ustream.tv/channel/18668654

	var initUStream = function(content, feature) {
		var container = document.getElementsByClassName('leaflet-bottom leaflet-left')[0];
		var uStreamContainer = document.createElement('div');
		uStreamContainer.id = 'ustream';
		uStreamContainer.className = 'leaflet-control';
		uStreamContainer.innerHTML = content;
		container.appendChild(uStreamContainer);
            /*
             create player instances
             */
//            var alpha = UstreamEmbed("FrameAlpha");
			/*
             bind controls to buttons
             */
//			var playAlpha = document.getElementById('PlayAlpha');
//			var pauseAlpha = document.getElementById('PauseAlpha');
//            playAlpha.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); alpha.callMethod('play'); });
//            pauseAlpha.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); alpha.callMethod('pause'); });
            /*
             event handler for events received from the embed iframe
             */
//            var onEmbedEvent = function (id, event, data) {
/*            var onEmbedEvent = function (event) {
//                var parent = document.getElementById(id);
                var parent = document.getElementById('ustream');


                switch (event) {
                    case "live":
						var liveElement = parent.getElementsByClassName('st-live')[0];
             //           liveElement.show();
             //           parent.getElementsByClassName('st-offline')[0].hide();
                        break;
                    case "offline":
            //            parent.getElementsByClassName('st-offline')[0].show();
            //            parent.getElementsByClassName('st-live')[0].hide();
                        break;
                    case "playing":
                        if (data) {
           //                 parent.getElementsByClassName('st-playing')[0].show()
                        } else {
           //                 parent.getElementsByClassName('st-playing')[0].hide();
                        }
                        break;
                    case "finished":
            //            parent.getElementsByClassName('st-ended')[0].show();
                        break;
                }

            }
*/            /*
             adding event handlers, one by one
             */
//            alpha.addListener('live', onEmbedEvent);
//            alpha.addListener('offline', onEmbedEvent);
//            alpha.addListener('playing', onEmbedEvent);
//            alpha.addListener('finished', onEmbedEvent);
         //   alpha.addListener('live', $.proxy(onEmbedEvent, null, 'StatusAlpha'));			// function, context, params
         //   alpha.addListener('offline', $.proxy(onEmbedEvent, null, 'StatusAlpha'));
         //   alpha.addListener('playing', $.proxy(onEmbedEvent, null, 'StatusAlpha'));
         //   alpha.addListener('finished', $.proxy(onEmbedEvent, null, 'StatusAlpha'));

	};



});
// ApriAppAir Class end ===============================================================================
