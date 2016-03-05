/*jslint devel: true,  undef: true, newcap: true, white: true, maxerr: 50 */
/*global APRI*/
/**
 * @module aireas-stats
 */

"use strict"; // This is for your code to comply with the ECMAScript 5 standard.

// ApriAppAir class def ===============================================================================
// parent: class ApriAppBase
var ApriAppAireasStats = ApriApps.ApriAppAireasStats = ApriApps.ApriAppAireasStats || ApriApps.ApriAppBase.extend(function () {
	
	//initializer is executed before the constructor.
    this.initializer = function() {
        //...
    };

	var apriCookieBase;
	
	var apriForms;
	
	var appConfig = {};
	var secureSite;
	var siteProtocol, siteUrl;
	var sitePrefixExtern;
	
	var apriConfig, apriClientInfo;
	var appBodyContainer, apriViewContainer;

	var templates;
	var refreshButton;
	
	var viewBlocks;
	
	var viewFields;
	var apriAjaxBase, apriAjaxBaseQ, apriAjaxBase2;
	
	var aireasAvgType; // 'UFP', 'PM1', 'PM25', 'PM10', 'SPMI', 'OZON', 'NO2', 'CELC', 'HUM', 'AMBHUM', 'AMBTEMP'
	var aireasInterpolate;
	var aireasArea;
	var aireasAirbox;
	var aireasTime;
	var aireasHistYear;
	var aireasHistMonth;
	var aireasHistDay;
	var aireasHistYearFrom;
	var aireasHistYearTo;
	var aireasHistMonthFrom;
	var aireasHistMonthTo;
	var aireasGraphOrigin;
	var aireasAirboxTD;
	var aireasReportType;
	
	var graphicTrend;
	var graphOptions;
	
	var parsedUrl;
	
	this.constructor = function(objectId, options) {
		//Execute the constructor of the class we extended.
        this.super(objectId, options);
		
		secureSite 			= false;
		siteProtocol 		= secureSite?'https://':'http://';
		siteUrl				= siteProtocol + 'scapeler.com/SCAPE604';
		sitePrefixExtern	= ''; //'scapeler.com/extern/'
		
		apriForms 			= {};
		
		
		
		apriConfig = APRI.getConfig();
		apriClientInfo = APRI.getClientInfo();
		
		// default deeplink parameter values
		aireasAvgType 		= 'OZON'; // 'UFP', 'PM1', 'PM25', 'PM10', 'SPMI', 'OZON', 'NO2', 'CELC', 'HUM', 'AMBHUM', 'AMBTEMP'
		aireasArea			= 'EHV';
		aireasTime			= 0;
		aireasAirbox		= 'all'
		aireasHistYear		= 'all';
		aireasHistMonth		= '';
		aireasHistDay		= '';
		aireasHistYearFrom	= '';
		aireasHistYearTo	= '';
		aireasHistMonthFrom	= '';
		aireasHistMonthTo	= '';
		aireasGraphOrigin	= 'year';
		aireasAirboxTD 		= 'Y';
		aireasReportType	= 'N'; //Q=Quarter
		
		graphOptions = {}; 
		
		getDeepLinkVars();

		
		appBodyContainer = document.getElementsByClassName('apri-app-body apri-client-aireas-stats')[0];

//		var logoContainer = document.createElement('div');
//		logoContainer.className = 'logo-container';
//		appBodyContainer.appendChild(logoContainer);
		
//		var _container = document.createElement('div');
//		_container.className = 'top-logo-container';		
//		var scapelerLogo = document.createElement('img');
//		scapelerLogo.className = 'top-logo';
//		scapelerLogo.src = "../client/apri-client-openiod/logos/scapeler.png";
//		scapelerLogo.alt = "Scapeler";
//		_container.appendChild(scapelerLogo);
//		var _containerLabel = document.createElement('div');
//		_containerLabel.className = 'top-logo-label';
//		_containerLabel.innerHTML = 'Scapeler';
//		_container.appendChild(_containerLabel);
//		logoContainer.appendChild(_container);
		
		apriAjaxBase 	= new ApriCore.ApriAjaxBase();
//		apriAjaxBaseQ 	= new ApriCore.ApriAjaxBase();
//		apriAjaxBase2 	= new ApriCore.ApriAjaxBase();

		this.initView();
		
				
	}
	
var initGraphicTrend = function(options) {
		
		apriViewContainer.classList.add("loading-animation");
		
		apriAjaxBase.request(options.url + options.parameters, {}, options, createGraphicTrend, null );
}	

var setOptionsParameters = function() {
		graphOptions.parameters = ''; 
		if (graphOptions.airbox == 'all' && graphOptions.area != 'all') {
			getRegionAirboxSelection();
		}
		graphOptions.parameters += "&area=" 				+ graphOptions.area;
		graphOptions.parameters += "&airbox=" 				+ graphOptions.airbox;
		graphOptions.parameters += "&featureofinterest=" 	+ graphOptions.airbox;
		graphOptions.parameters	+= "&avgType=" 				+ graphOptions.sensor;
		graphOptions.parameters	+= "&sensor=" 				+ graphOptions.sensor;
		graphOptions.parameters	+= "&type=" 				+ graphOptions.reportType;
		graphOptions.parameters	+= "&interpolate=" 			+ graphOptions.interpolate;
		graphOptions.parameters	+= "&histYear=" 			+ graphOptions.histYear; 
		graphOptions.parameters	+= "&histMonth=" 			+ graphOptions.histMonth;
		graphOptions.parameters	+= "&histDay=" 				+ graphOptions.histDay;
		graphOptions.parameters	+= "&histYearFrom=" 		+ graphOptions.histYearFrom; 
		graphOptions.parameters	+= "&histYearTo=" 			+ graphOptions.histYearTo; 
		graphOptions.parameters	+= "&histMonthFrom=" 		+ graphOptions.histMonthFrom;
		graphOptions.parameters	+= "&histMonthTo=" 			+ graphOptions.histMonthTo;
		graphOptions.parameters	+= "&graphOrigin=" 			+ graphOptions.graphOrigin;	
		graphOptions.parameters	+= "&airboxCumulate=" 		+ graphOptions.airboxTD;	
			
		graphOptions.parameters	+= "&format=json";	
		
		setPushState();
}

	//===========================================================================  end of constructor

	this.initView = function() {

		templates = {};
		viewBlocks = {};
		viewFields = {};
		
		var self = this;
		
		var _template = 'aireas-stats';
		this.getTemplate(_template, {urlSystemRoot: apriConfig.urlSystemRoot, appPath: 'client/', app: 'aireas-stats' }, {}, function(result) {
			templates[_template] = Handlebars.compile(result);
			var context = {title: "My New Post", body: "This is my first post!"};
			var html    = templates[_template](context);
			
			var viewContainer = document.createElement('div');
			viewContainer.className = 'apri-view-container';
			viewContainer.innerHTML = html;
			appBodyContainer.appendChild(viewContainer);
			
			
			viewManager.parseViewBlocks(document.body);
			
//			refreshButton = document.getElementById('-viewFieldRefreshButton-button');
//			refreshButton.addEventListener('click', executeApi);
			
//			viewFields.viewFieldUrl 				= document.getElementById('-viewFieldUrl-input');

			// test url:
//			viewFields.viewFieldUrl.value = 'http://openiod.com/SCAPE604/openiod?SERVICE=WPS&REQUEST=Execute&identifier=observation_aireas_average&featureofinterest=32.cal&histYear=2014&histMonth=all&histDay=10&avgType=PM10&format=json';

//			viewFieldUrl_parseUrl();
			
//			viewFields.viewFieldResult = document.getElementById('-viewFieldResult-input');
			
			//viewFields.viewFieldUrl.onblur = viewFieldUrl_parseUrl;
//			viewFields.viewFieldUrl.addEventListener('keyup', viewFieldUrl_parseUrl);
			

		apriForms.filters = document.getElementsByClassName('apri-form aireas-stats-filters')[0];
		apriForms.filters.formComponentsHtml = apriForms.filters.getElementsByClassName('apri-form-component');
		apriForms.filters.formComponents = {};
		for (var fcI=0;fcI<apriForms.filters.formComponentsHtml.length;fcI++) {
			var _formComponentHtml = apriForms.filters.formComponentsHtml[fcI];
			var _name = _formComponentHtml.getAttribute("name");
			apriForms.filters.formComponents[_name] = {};
			apriForms.filters.formComponents[_name].element = _formComponentHtml;	
		}
		
		
		var avgPerPeriod = 'Year';
		if (aireasHistDay==undefined || aireasHistDay=='') {
			if (aireasHistMonth==undefined || aireasHistMonth=='') {
				avgPerPeriod = 'Year';
			} else {
				avgPerPeriod = 'Month';
			}
			//apriForms.filters.formComponents[_name].element avgPerYearMonthDaySelect
		} else {
			avgPerPeriod = 'Day';
		}
		
		var _elementAbortRetrievalButton = apriForms.filters.formComponents['abortRetrieval'].element.getElementsByTagName('div')[0];
		_elementAbortRetrievalButton.addEventListener('click', function(event) {
			apriAjaxBase.abort();
			alert('aborted');
  		}, false); 
		
		var _elementSelect = apriForms.filters.formComponents['avgPerYearMonthDaySelect'].element.getElementsByTagName('select')[0];
		
		_elementSelect.addEventListener('change', function(event) {
    		//alert( 'test' );
			if (this.value=='Year') {
				aireasHistYear		= 'all';
				aireasHistMonth		= '';
				aireasHistDay		= '';
			}
			if (this.value=='Month') {
				aireasHistYear		= 'all';
				aireasHistMonth		= 'all';
				aireasHistDay		= '';
			}
			if (this.value=='Day') {
				aireasHistYear		= 'all';
				aireasHistMonth		= 'all';
				aireasHistDay		= 'all';
				
				if (aireasHistMonth = 'all') {
					aireasHistMonth = '1';
				}
			}
			graphOptions.histYear 		= aireasHistYear;
			graphOptions.histMonth 		= aireasHistMonth;
			graphOptions.histDay 		= aireasHistDay;

			setOptionsParameters();			
			
			initGraphicTrend(graphOptions);

			
  		}, false); 
		
		for(var i=0;i<_elementSelect.length;i++) { 
			if(_elementSelect[i].value==avgPerPeriod) {
				_elementSelect[i].setAttribute("selected","selected"); 
				break;
			}
		}

		var _elementAireasAreaSelect = apriForms.filters.formComponents['aireasAreaSelect'].element.getElementsByTagName('select')[0];
				
		_elementAireasAreaSelect.addEventListener('change', function(event) {
 			aireasArea		= this.value;
			graphOptions.area = aireasArea;
			
			getRegionAirboxSelection();			

			setOptionsParameters();			
			
			initGraphicTrend(graphOptions);

  		}, false); 
		
		for(var i=0;i<_elementAireasAreaSelect.length;i++) { 
			if(_elementAireasAreaSelect[i].value==aireasArea) {
				_elementAireasAreaSelect[i].setAttribute("selected","selected"); 
				break;
			}
		}
		


		var _elementSensorSelect = apriForms.filters.formComponents['sensorSelect'].element.getElementsByTagName('select')[0];
		
		_elementSensorSelect.addEventListener('change', function(event) {
 			aireasAvgType		= this.value;
			graphOptions.sensor = aireasAvgType;

			setOptionsParameters();			
			
			initGraphicTrend(graphOptions);

			
  		}, false); 
		
		for(var i=0;i<_elementSensorSelect.length;i++) { 
			if(_elementSensorSelect[i].value==aireasAvgType) {
				_elementSensorSelect[i].setAttribute("selected","selected"); 
				break;
			}
		}

		var _elementInterpolateSelect = apriForms.filters.formComponents['interpolateSelect'].element.getElementsByTagName('select')[0];
		
		_elementInterpolateSelect.addEventListener('change', function(event) {
 			aireasInterpolate		= this.value;
			graphOptions.interpolate = aireasInterpolate;

			setOptionsParameters();			
			
			initGraphicTrend(graphOptions);

			
  		}, false); 
		
		for(var i=0;i<_elementInterpolateSelect.length;i++) { 
			if(_elementInterpolateSelect[i].value==aireasInterpolate) {
				_elementInterpolateSelect[i].setAttribute("selected","selected"); 
				break;
			}
		}


		var _elementAirboxTDSelect = apriForms.filters.formComponents['airboxTDSelect'].element.getElementsByTagName('select')[0];
		
		_elementAirboxTDSelect.addEventListener('change', function(event) {
 			aireasAirboxTD				= this.value;
			graphOptions.airboxTD 		= aireasAirboxTD;

			setOptionsParameters();			
			
			initGraphicTrend(graphOptions);

			
  		}, false); 
		
		for(var i=0;i<_elementAirboxTDSelect.length;i++) { 
			if(_elementAirboxTDSelect[i].value==aireasAirboxTD) {
				_elementAirboxTDSelect[i].setAttribute("selected","selected"); 
				break;
			}
		}

		var _elementHistYearSelect = apriForms.filters.formComponents['histYearSelect'].element.getElementsByTagName('select')[0];
				
		_elementHistYearSelect.addEventListener('change', function(event) {
 			aireasHistYear		= this.value;
			graphOptions.histYear = aireasHistYear;
			
			setOptionsParameters();			
			
			initGraphicTrend(graphOptions);

  		}, false); 
		
		for(var i=0;i<_elementHistYearSelect.length;i++) { 
			if(_elementHistYearSelect[i].value==aireasHistYear) {
				_elementHistYearSelect[i].setAttribute("selected","selected"); 
				break;
			}
		}


		var _elementHistYearFromSelect = apriForms.filters.formComponents['histYearFromSelect'].element.getElementsByTagName('select')[0];
				
		_elementHistYearFromSelect.addEventListener('change', function(event) {
 			aireasHistYearFrom		= this.value;
			graphOptions.histYearFrom = aireasHistYearFrom;
			
			setOptionsParameters();			
			
			initGraphicTrend(graphOptions);

  		}, false); 
		
		for(var i=0;i<_elementHistYearFromSelect.length;i++) { 
			if(_elementHistYearFromSelect[i].value==aireasHistYearFrom) {
				_elementHistYearFromSelect[i].setAttribute("selected","selected"); 
				break;
			}
		}

		var _elementHistYearToSelect = apriForms.filters.formComponents['histYearToSelect'].element.getElementsByTagName('select')[0];
				
		_elementHistYearToSelect.addEventListener('change', function(event) {
 			aireasHistYearTo		= this.value;
			graphOptions.histYearTo = aireasHistYearTo;
			
			setOptionsParameters();			
			
			initGraphicTrend(graphOptions);

  		}, false); 
		
		for(var i=0;i<_elementHistYearToSelect.length;i++) { 
			if(_elementHistYearToSelect[i].value==aireasHistYearTo) {
				_elementHistYearToSelect[i].setAttribute("selected","selected"); 
				break;
			}
		}


		var _elementHistMonthSelect = apriForms.filters.formComponents['histMonthSelect'].element.getElementsByTagName('select')[0];
				
		_elementHistMonthSelect.addEventListener('change', function(event) {
 			aireasHistMonth		= this.value;
			graphOptions.histMonth = aireasHistMonth;
			
			setOptionsParameters();			
			
			initGraphicTrend(graphOptions);

  		}, false); 
		
		for(var i=0;i<_elementHistMonthSelect.length;i++) { 
			if(_elementHistMonthSelect[i].value==aireasHistMonth) {
				_elementHistMonthSelect[i].setAttribute("selected","selected"); 
				break;
			}
		}
		var _elementHistMonthFromSelect = apriForms.filters.formComponents['histMonthFromSelect'].element.getElementsByTagName('select')[0];
				
		_elementHistMonthFromSelect.addEventListener('change', function(event) {
 			aireasHistMonthFrom		= this.value;
			graphOptions.histMonthFrom = aireasHistMonthFrom;
			
			setOptionsParameters();			
			
			initGraphicTrend(graphOptions);

  		}, false); 
		
		for(var i=0;i<_elementHistMonthFromSelect.length;i++) { 
			if(_elementHistMonthFromSelect[i].value==aireasHistMonthFrom) {
				_elementHistMonthFromSelect[i].setAttribute("selected","selected"); 
				break;
			}
		}

		var _elementHistMonthToSelect = apriForms.filters.formComponents['histMonthToSelect'].element.getElementsByTagName('select')[0];
				
		_elementHistMonthToSelect.addEventListener('change', function(event) {
 			aireasHistMonthTo		= this.value;
			graphOptions.histMonthTo = aireasHistMonthTo;
			
			setOptionsParameters();			
			
			initGraphicTrend(graphOptions);

  		}, false); 
		
		for(var i=0;i<_elementHistMonthToSelect.length;i++) { 
			if(_elementHistMonthToSelect[i].value==aireasHistMonthTo) {
				_elementHistMonthToSelect[i].setAttribute("selected","selected"); 
				break;
			}
		}




		
		apriViewContainer = document.getElementsByClassName('apri-view-body')[0];
		



/*
		
		var graphicGroupedHorBarContainer = document.createElement('div');
//			viewContainer.className = 'apri-view-container';
		apriViewContainer.appendChild(graphicGroupedHorBarContainer);
//		self.initGraphicGroupedHorBar({container:graphicGroupedHorBarContainer });

		var _options = {};
		_options.airbox = aireasAirbox;
		_options.sensor = aireasAvgType;
		
		_options.url = "http://openiod.com/SCAPE604/openiod?SERVICE=WPS&REQUEST=Execute&identifier=observation_aireas_average" + 
			"&featureofinterest=" + _options.airbox + 
			"&avgType=" + _options.sensor +
			"&histYear=all&histMonth=all&format=json";
		_options.container = graphicGroupedHorBarContainer;
		self.initGraphicGroupedHorBar(_options);
		


*/	
	

		var graphicTrendContainer = document.createElement('div');
//			viewContainer.className = 'apri-view-container';
		apriViewContainer.appendChild(graphicTrendContainer);
		
//		var _options2 = {};
		graphOptions.area 			= aireasArea;
		graphOptions.airbox 		= aireasAirbox;
		graphOptions.sensor 		= aireasAvgType;
		graphOptions.interpolate 	= aireasInterpolate;    //'basis'; //'step-after'; //'basis';
		graphOptions.histYear 		= aireasHistYear;
		graphOptions.histMonth 		= aireasHistMonth;
		graphOptions.histDay 		= aireasHistDay;
		graphOptions.histYearFrom 	= aireasHistYearFrom; //2015;
		graphOptions.histYearTo 	= aireasHistYearTo; //2015;
		graphOptions.histMonthFrom 	= aireasHistMonthFrom; //6;
		graphOptions.histMonthTo 	= aireasHistMonthTo; //6;
		graphOptions.graphOrigin	= aireasGraphOrigin; 
		graphOptions.airboxTD		= aireasAirboxTD; 
		
		graphOptions.reportType		= aireasReportType; 
		graphOptions.groupBy 		= 'airbox';
		graphOptions.description 	= '';

		graphOptions.url = "http://openiod.com/SCAPE604/openiod?SERVICE=WPS&REQUEST=Execute&identifier=observation_aireas_average";

		setOptionsParameters();			
		
		graphOptions.container = graphicTrendContainer;
		initGraphicTrend(graphOptions);



/*

		var graphicTrendContainerQ = document.createElement('div');
//			viewContainer.className = 'apri-view-container';
		apriViewContainer.appendChild(graphicTrendContainerQ);
		
		var _optionsQ = {};
		_optionsQ.airbox 		= aireasAirbox;
		_optionsQ.sensor 		= aireasAvgType;
		_optionsQ.reportType 	= aireasReportType;
		_optionsQ.histYear 		= aireasHistYear;
		_optionsQ.histMonth 	= aireasHistMonth;
		_optionsQ.histDay 		= aireasHistDay;
		_optionsQ.histYearFrom 	= aireasHistYearFrom;
		_optionsQ.histYearTo 	= aireasHistYearTo;
		_optionsQ.histMonthFrom = aireasHistMonthFrom;
		_optionsQ.histMonthTo 	= aireasHistMonthTo;
		
		_optionsQ.interpolate 	= 'step-after';
		_optionsQ.groupBy 		= 'avg_type'; //'avg_type'; 'airbox';
		_optionsQ.description 	= 'Meetwaarden per sensor gemiddeld per kwartaal';
		
//		http://localhost:4000/SCAPE604/openiod?SERVICE=WPS&REQUEST=Execute&identifier=observation_aireas_average&type=Q&featureofinterest=32.cal&histYear=2014&histMonth=all&histDay=10&avgType=PM10&format=json	
		
		_optionsQ.url = "http://openiod.com/SCAPE604/openiod?SERVICE=WPS&REQUEST=Execute&identifier=observation_aireas_average";
		_optionsQ.parameters 	= '';
		_optionsQ.parameters 	+= "&featureofinterest=" + _optionsQ.airbox;
		_optionsQ.parameters	+= "&avgType=" + _optionsQ.sensor;
		_optionsQ.parameters	+= "&type=" + _optionsQ.reportType;
		_optionsQ.parameters	+= "&histYear=" + _optionsQ.histYear; 
		_optionsQ.parameters	+= "&histMonth=" + _optionsQ.histMonth;
		_optionsQ.parameters	+= "&histDay=" + _optionsQ.histDay;
		_optionsQ.parameters	+= "&format=json";	
			
		_optionsQ.container = graphicTrendContainerQ;
		self.initGraphicTrend(_optionsQ);
*/
			
		}, null);
			
	}
	
	var airboxEHV = '1.cal,2.cal,3.cal,4.cal,5.cal,6.cal,7.cal,8.cal,9.cal,11.cal,11.cal,12.cal,13.cal,14.cal,16.cal,17.cal,19.cal,20.cal,21.cal,22.cal,23.cal,24.cal,25.cal,26.cal,27.cal,28.cal,29.cal,30.cal,31.cal,32.cal,34.cal,35.cal,36.cal,37.cal,39.cal';
	var airboxHELMOND 	= '15.cal';
	var airboxBREDA 	= '10.cal,18.cal,38.cal';
	var airboxNBRA 		= '1.cal,2.cal';
	
	var getRegionAirboxSelection = function() {
	
	
		if (aireasArea=='EHV') {
			aireasAirbox = airboxEHV;
		}
		if (aireasArea=='HELMOND') {
			aireasAirbox = airboxHELMOND;
		}
		if (aireasArea=='BREDA') {
			aireasAirbox = airboxBREDA;
		}
		if (aireasArea=='NBRA') {
			aireasAirbox = airboxEHV + ',' + airboxHELMOND + ',' + airboxBREDA; 
		}
		if (aireasArea=='All') {
			aireasAirbox = airboxEHV + ',' + airboxHELMOND + ',' + airboxBREDA; 
		}
		graphOptions.airbox = aireasAirbox;
		
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
				
				if (_key == 'area') 			aireasArea 			= value.toUpperCase();
				if (_key == 'sensor') 			aireasAvgType 		= value;
				if (_key == 'interpolate') 		aireasInterpolate	= value;
				if (_key == 'airbox') 			aireasAirbox 		= value;
				if (_key == 'time') 			aireasTime 			= parseFloat(value);
				if (_key == 'histYear')	 		aireasHistYear 		= value;
				if (_key == 'histMonth')		aireasHistMonth 	= value;
				if (_key == 'histDay') 			aireasHistDay		= value;
				if (_key == 'histYearFrom')	 	aireasHistYearFrom 	= value;
				if (_key == 'histYearTo')	 	aireasHistYearTo 	= value;
				if (_key == 'histMonthFrom')	aireasHistMonthFrom = value;
				if (_key == 'histMonthTo')		aireasHistMonthTo 	= value;
				if (_key == 'graphOrigin')		aireasGraphOrigin 	= value;
				if (_key == 'airboxCumulate')	aireasAirboxTD		= value;				
				if (_key == 'reportType')		aireasReportType 	= value;
				
				//_area 		= areas[areaIndInt].deepLinkVars;
				//
				//if (_key == 'layers') {
				//	_area[_key] = value.split(',');
				//} else {
				//	_area[_key]	= value;
				//}

			});

			return;
	};
	
	
	var setPushState = function() {
		var _variables = "";
		var _firstVar = true;
		var _areaIndex = "";
		var dltype = "1";	// deeplink type = '1'=standard, future: encoded dltype?
		_variables = _variables + "dltype=" + dltype + graphOptions.parameters;

		window.history.pushState({apri:'aireas-stats'}, "aireas-stats", "?" + _variables);
	};

	
	
	
	

	this.initGraphicGroupedHorBar = function(options) {
		apriAjaxBase2.request(options.url, {}, options, createGraphicGroupedHorBar, null );
	}		

var createGraphicTrend = function(result, options) {
	var i,j, key, 
		inpRecord, outRecord, outRecord2,
		data=[];

	apriViewContainer.classList.remove("loading-animation");
	
	var jsonResponse = result.sort(function(a,b) {								
		//var _aDate = new Date(a.date).getTime();
		//var _bDate = new Date(b.date).getTime();
					
		if (a.hist_year < b.hist_year) return -1;
		if (a.hist_year > b.hist_year) return 1;
		if (a.hist_month < b.hist_month) return -1;
		if (a.hist_month > b.hist_month) return 1;
		if (a.hist_day < a.hist_day) return -1;
		if (a.hist_day > a.hist_day) return 1;
//		if (a.avg_type < b.avg_type) return -1;
//		if (a.avg_type > b.avg_type) return 1;
		if (a.airbox < b.airbox) return -1;
		if (a.airbox > b.airbox) return 1;
		if (a.avg_type < b.avg_type) return -1;
		if (a.avg_type > b.avg_type) return 1;
		
		return 0;
	})

	function structuredClone_replaceState(obj) {
		var oldState = history.state;
		history.replaceState(obj, null);
		var clonedObj = history.state;
		history.replaceState(oldState, null);
		return clonedObj;
	}	
	
	// postgres averages
	if (jsonResponse[0] && jsonResponse[0].hist_year ) {
		for(i=0;i<jsonResponse.length;i++) {
			var _dateAbsolute, _dateRelative;
			inpRecord = jsonResponse[i];
			outRecord = {};			
			
			outRecord = inpRecord; 
			
			var _prefix = ''; 
			var _prefixYearDelta = 0;
			if (options.graphOrigin == 'year') {
				_prefix = outRecord.hist_year;
				_prefixYearDelta = inpRecord.hist_year - new Date().getFullYear(); 
			}
						
			if (options.groupBy == 'airbox') {
				if (inpRecord.airbox==undefined) {
					outRecord.groupByKey = _prefix;
				} else {
					outRecord.groupByKey = _prefix + "_" + inpRecord.airbox;
				}
				var _histDay = 1;
				if (inpRecord.hist_day && inpRecord.hist_day!=null) _histDay = inpRecord.hist_day;
				var _histMonth = 0;
				if (inpRecord.hist_month && inpRecord.hist_month!=null) _histMonth = inpRecord.hist_month-1;
				_dateAbsolute = new Date(inpRecord.hist_year, _histMonth, _histDay);
				_dateRelative = new Date(inpRecord.hist_year-_prefixYearDelta, _histMonth, _histDay);
			} else {
				outRecord.groupByKey = _prefix + inpRecord.avg_type;
				_dateAbsolute = new Date(inpRecord.hist_year, (inpRecord.hist_q*3)-2-1, 1);  //first day of quartal
				_dateRelative = new Date(inpRecord.hist_year-_prefixYearDelta, (inpRecord.hist_q*3)-2-1, 1);  //first day of quartal
			}
			
			// set graph origin date for more years in one graph. 
			outRecord.dateAbsolute 	= new Date(_dateAbsolute.getTime());
			outRecord.dateRelative 	= new Date(_dateRelative.getTime());
			outRecord.date 			= new Date(_dateRelative.getTime());
			
//			if (inpRecord.airbox == '16.cal') continue;
//			if (inpRecord.airbox == '18.cal') continue;
//			if (inpRecord.airbox == '38.cal') continue;
			if (inpRecord.avg_avg == 0) continue;
//			if ( !(inpRecord.airbox == '14.cal' ||inpRecord.airbox == '12.cal') ) continue;
//			if ( inpRecord.airbox == '12.cal' ) continue;

			outRecord.airbox 	= outRecord.airbox?_prefix + "_" + outRecord.airbox:null;
			outRecord.avg_type 	= outRecord.avg_type?_prefix + "_" + outRecord.avg_type:null;

			outRecord.value = inpRecord.avg_avg;
			
			data.push(outRecord);

			outRecord2=structuredClone_replaceState(outRecord) 
			//outRecord2 = Object.assign({},outRecord);  // copy entry
			//outRecord2 = history.outRecord;  // copy entry

			
			// extra entry for end-of-period
			if (inpRecord.hist_month == null) {  // year values
				outRecord2.dateAbsolute.setFullYear(outRecord2.dateAbsolute.getFullYear() + 1);
				outRecord2.dateRelative.setFullYear(outRecord2.dateRelative.getFullYear() + 1);
			} else { 
				if (inpRecord.hist_day == null) {
					outRecord2.dateAbsolute.setMonth(outRecord2.dateAbsolute.getMonth() + 1);
					outRecord2.dateRelative.setMonth(outRecord2.dateRelative.getMonth() + 1);
				} else {
					outRecord2.dateAbsolute= new Date(outRecord2.dateAbsolute.getFullYear(),outRecord2.dateAbsolute.getMonth(),outRecord2.dateAbsolute.getDate() + 1);
					outRecord2.dateRelative= new Date(outRecord2.dateRelative.getFullYear(),outRecord2.dateRelative.getMonth(),outRecord2.dateRelative.getDate() + 1);
				}
			}
			outRecord2.dateAbsolute = new Date(outRecord2.dateAbsolute.getTime()-1000);
			outRecord2.dateRelative = new Date(outRecord2.dateRelative.getTime()-1000);
			outRecord2.date 		= new Date(outRecord2.dateRelative.getTime());
			data.push(outRecord2);
			
		}
	}

	
	if (graphicTrend==null) {
		graphicTrend = new ApriD3GraphicTrend();
		graphicTrend.createGraphic(data, options);
	} else {
		graphicTrend.updateGraphic(data, options);
	}	
	graphicTrend.render();
}


var createGraphicGroupedHorBar = function(result, options) {
	var i, key, 
		inpRecord, outRecord, 
		data={};
//	var jsonResponse = JSON.parse(result);
	var jsonResponse = result;

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

	
	
	
	
	
	
	
	var viewFieldUrl_parseUrl = function(e) {
		parsedUrl = parseUrl(viewFields.viewFieldUrl.value);
		viewFields.viewFieldServerProtocol.value 	= parsedUrl.serverProtocol;
		viewFields.viewFieldServer.value 			= parsedUrl.server;
		viewFields.viewFieldServerPort.value 		= parsedUrl.serverPort;
		viewFields.viewFieldUrlPath.value 			= parsedUrl.urlPath;
		viewFields.viewFieldUrlParameters.value 	= parsedUrl.urlParameters;
		viewField_check_all();
	}

//	var executeApi = function(e) {
//		//alert('test');
//		var _url = viewFields.viewFieldUrl.value;
//		apriAjaxBase.request(_url,{},{},showResult, null);		
//	};
	
	var viewFieldUrl_Check = function(e) {
		alert(viewFields.viewFieldUrl.value);
	}

	var viewFieldServerProtocol_Check = function(e) {
		var _error = false;
		if (viewFields.viewFieldServerProtocol.value == 'http' | viewFields.viewFieldServerProtocol.value == 'https' ) {
			viewFields.viewFieldServerProtocol.classList.remove("viewField-error");
			viewFields.viewFieldUrl.value = stringifyUrl();
		} else {
			_error = true;
			viewFields.viewFieldServerProtocol.classList.add("viewField-error");
		}
		//alert(viewFields.viewFieldServerProtocol.value);
	}
	var viewFieldServer_Check = function(e) {
		var _error = false;
		if (viewFields.viewFieldServer.value != '' ) {
			viewFields.viewFieldServer.classList.remove("viewField-error");
			viewFields.viewFieldUrl.value = stringifyUrl();
		} else {
			_error = true;
			viewFields.viewFieldServer.classList.add("viewField-error");
		}
	}
	var viewFieldServerPort_Check = function(e) {
		var _error = false;
		if (viewFields.viewFieldServerPort.value != '' ) {
			viewFields.viewFieldServerPort.classList.remove("viewField-error");
			viewFields.viewFieldUrl.value = stringifyUrl();
		} else {
			_error = true;
			viewFields.viewFieldServerPort.classList.add("viewField-error");
		}
	}	
	var viewFieldUrlPath_Check = function(e) {
		var _error = false;
		if (viewFields.viewFieldUrlPath.value != '' ) {
			viewFields.viewFieldUrlPath.classList.remove("viewField-error");
			viewFields.viewFieldUrl.value = stringifyUrl();
		} else {
			_error = true;
			viewFields.viewFieldUrlPath.classList.add("viewField-error");
		}
	}	
	var viewFieldUrlParameters_Check = function(e) {
		var _error = false;
		if (viewFields.viewFieldUrlParameters.value != '' ) {
			viewFields.viewFieldUrlParameters.classList.remove("viewField-error");
			var params = parseUrlParameters(viewFields.viewFieldUrlParameters.value);
			viewFields.viewFieldUrl.value = stringifyUrl();
		} else {
			_error = true;
			viewFields.viewFieldUrlParameters.classList.add("viewField-error");
		}
	}	
	
	var viewField_check_all = function() {
		viewFieldServerProtocol_Check();
		viewFieldServer_Check();
		viewFieldServerPort_Check();
		viewFieldUrlPath_Check();
		viewFieldUrlParameters_Check();
	}


	
	var showResult = function(result) {
		viewFields.viewFieldResult.value = JSON.stringify(result);
	}
	
	var parseUrl = function(url) {
		// result default values
		var result = {};
		result.serverProtocol 	= 'http';
		result.server			= 'openiod.com'; 
		result.serverPort 		= '80';
		result.urlPath 			= '';
		result.urlParameters 	= '';

		if (url == '') return result;
		var _work = url;
		
		var _index = _work.search(/(http|https):\/\//);
		if (_index == 0) {
			_index = _work.search(/:\/\//);
			result.serverProtocol = _work.substr(0, _index);
			_work = _work.substr(_index+3);
		};
		
		var _index = _work.search(/(:|\/)/);
		if (_index >=0) {
			result.server = _work.substr(0, _index);
			_work = _work.substr(_index);
		} else {
			result.server = _work;
			return result;
		};
		_index = _work.search(/\//);
		if (_index == -1) {
			result.server = _work;
			return result;
		};
		if (_index == 0 | _index == 1) {
			result.serverPort = '80';
			if (_index == 1) _work = _work.substr(1);
		} else {
			result.serverPort = _work.substr(1, _index-1);
			_work = _work.substr(_index);
		};

		_index = _work.search(/\?/);
		if (_index == -1) {
			result.urlPath = _work;
			return result;
		};
		if (_index == 0) {
			result.urlPath = '';
		} else {
			result.urlPath = _work.substr(0, _index);
			_work = _work.substr(_index);
		};
		
		result.urlParameters = _work.substr(1);
		return result;
		
	};
	
	var parseUrlParameters = function(parameters) {
		var _keyValues = {};
		var _params = parameters.split('&');
		for (var i=0;i<_params.length;i++) {
			var _keyValue 	= _params[i].split('=');
			var _key		= _keyValue[0];
			var _value 		= _keyValue[1];
			_keyValues[_key] 	= _value;
		}
		return _keyValues;
	}

	var stringifyUrl = function() {
		var _url = '';
		var _port='';
		if (viewFields.viewFieldServerPort.value == '80' & viewFields.viewFieldServerProtocol.value == 'http' ) {
			_port='';
		} else {
			_port = ':' + viewFields.viewFieldServerPort.value;
		}
		_url = _url.concat(viewFields.viewFieldServerProtocol.value,
			'://',
			viewFields.viewFieldServer.value, 
			_port,
			'',
			viewFields.viewFieldUrlPath.value,
			'?', 
			viewFields.viewFieldUrlParameters.value
		);
		return _url; 
	}
	
// View manager
// apri-view-block 
//  - apri-view-field
//  - apri-view-field-list-block
//  	- apri-view-field-list-item
//     		- apri-view-field
// 			- apri-view-list-block
//			  	- apri-view-field-list-item
//					- apri-view-field
//						- apri-view-field-label
//						- apri-view-field-message
//						- apri-view-field-content
//						- apri-view-field-inq
 	
	var viewManager = {};
	viewManager.viewBlocks={};
	viewManager.parseViewBlocks = function(domElement) {
		var _viewBlocks = domElement.getElementsByClassName('apri-view-block');
		for (var i=0;i<_viewBlocks.length;i++) {
			var _viewBlock = _viewBlocks[i];
			_viewBlock.id = APRI.UTIL.apriGuid(_viewBlock.id);
			viewManager.viewBlocks[_viewBlock.id]={};
			viewManager.viewBlocks[_viewBlock.id].domElement = _viewBlock;
			
			viewManager.parseViewBlockFields(viewManager.viewBlocks[_viewBlock.id]);
			viewManager.parseViewBlockLists(viewManager.viewBlocks[_viewBlock.id]);
		}
	}
	// get all field children within the dom-element
	viewManager.parseViewBlockFields = function(viewBlock) {
		if (viewBlock.viewBlockFields==undefined) viewBlock.viewBlockFields={};
		var _viewBlockFields = viewBlock.domElement.getElementsByClassName('apri-view-field');
		for (var i=0;i<_viewBlockFields.length;i++) {
			var _viewBlockField = _viewBlockFields[i];
			_viewBlockField.id = APRI.UTIL.apriGuid(_viewBlockField.id);
			viewBlock.viewBlockFields[_viewBlockField.id]={};
			viewBlock.viewBlockFields[_viewBlockField.id].domElement = _viewBlockField;
		}
	}
	// get all list children within the dom-element
	viewManager.parseViewBlockLists = function(viewBlock) {
		if (viewBlock.viewBlockLists==undefined) viewBlock.viewBlockLists={};
		var _viewBlockLists = viewBlock.domElement.getElementsByClassName('apri-view-list');
		for (var i=0;i<_viewBlockLists.length;i++) {
			var _viewBlockList = _viewBlockLists[i];
			_viewBlockList.id = APRI.UTIL.apriGuid(_viewBlockList.id);
			viewBlock.viewBlockLists[_viewBlockList.id]={};
			viewBlock.viewBlockLists[_viewBlockList.id].domElement = _viewBlockList;
			
			//recursive get lists and fields  
			viewManager.parseViewBlockListItems(viewBlock.viewBlockLists[_viewBlockList.id]);
			//viewManager.parseViewBlockLists(viewBlock.viewBlockLists[_viewBlockList.id]);			
		}
	}	

	// get list items within the view-list
	viewManager.parseViewBlockListItems = function(viewBlockList) {
		if (viewBlockList.viewBlockListItems==undefined) viewBlockList.viewBlockListItems={};
		var _viewBlockListItems = viewBlockList.domElement.childNodes;
		for (var i=0;i<_viewBlockListItems.length;i++) {
			var _viewBlockListItem = _viewBlockListItems[i];
			if (_viewBlockListItem.classList == undefined) continue;
			if (!_viewBlockListItem.classList.contains('apri-view-list-item') ) continue;
			
			_viewBlockListItem.id = APRI.UTIL.apriGuid(_viewBlockListItem.id);
			viewBlockList.viewBlockListItems[_viewBlockListItem.id]={};
			viewBlockList.viewBlockListItems[_viewBlockListItem.id].domElement = _viewBlockListItem;
			
			//recursive get lists fields  
			viewManager.parseViewBlockFields(viewBlockList.viewBlockListItems[_viewBlockListItem.id]);
			viewManager.parseViewBlockLists(viewBlockList.viewBlockListItems[_viewBlockListItem.id]);			
		}
	}	





});
// ApriApp Class end ===============================================================================

