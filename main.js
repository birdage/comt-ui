var map;
var lyrQuery;
var mapDate;
var catalog = [];
var plotData = [];
var proj3857 = new OpenLayers.Projection("EPSG:3857");
var proj4326 = new OpenLayers.Projection("EPSG:4326");

var buttonClasses = [
   'primary'
  ,'success'
  ,'info'
  ,'warning'
  ,'danger'
  ,'dark-blue'
  ,'tan'
  ,'dark-green'
  ,'brown'
  ,'aqua'
  ,'dark-pink'
  ,'mustard'
];
var name2Color = {};

var lineColors = [
   ['#66C2A5','#1B9E77']
  ,['#FC8D62','#D95F02']
  ,['#8DA0CB','#7570B3']
  ,['#E78AC3','#E7298A']
  ,['#A6D854','#66A61E']
  ,['#FFD92F','#E6AB02']
  ,['#E5C494','#A6761D']
  ,['#B3B3B3','#666666']
];

function resize() {
  var 	mapOffset 	= 103,
        resultsTableOffset = 170,
        activeMapLayersTableOffset = 170,
        timeSliderOffset = 150;
	sliderOffset = 50;
  $('#mapView').height($(window).height() - mapOffset - sliderOffset - timeSliderOffset);
  $('#results .table-wrapper').height($(window).height() - resultsTableOffset);
  $('#active-layers .table-wrapper').height($(window).height() - activeMapLayersTableOffset);
  if (hasScrollBar($('#active-layers .table-wrapper')[0]))
    $('#active-layers table tbody td:last-child').css('width', '37px');
  else {
    $('#active-layers table tbody td:last-child').css('width', '54px');
    $('#active-layers .table-wrapper').css('height', 'auto');
  }
  map.updateSize();
  plot();
}

window.onresize = resize;

function categoryClick() {
  syncQueryResults();
}

function filterValueSelect() {
  var id = $(this).attr('id').replace('list','filter-btn');
  $('#' + id).addClass('active');
  // Give the button time to add its class (which is used for testing in the query).
  setTimeout(function() {
    syncQueryResults();
  },100);
}

function addToMap() {
  var c = catalog[$(this).parent().parent().children('td:first-child').data('idx')];
  var lyrName = $(this).data('name');
  var lc = 0;
  if (_.isEmpty(map.getLayersByName(c.name + '-' + lyrName))) {
    if (!mapDate) {
      mapDate = isoDateToDate(c.temporal[0]);
    }
    lyrName = addWMS({
       group  : c.name
      ,url    : c.url
      ,layers : lyrName
      ,styles : c.layers[lyrName]
      ,times  : c.temporal
      ,bbox   : new OpenLayers.Bounds(c.spatial).transform(proj4326,proj3857)
    });
    lc++;
  }

  if (lc > 0) {
    $('ul.nav li:last-child a').trigger('click');
    var times = c.temporal;
    $.each($('#active-layers table tbody tr td:first-child'),function() {
      times = times.concat(map.getLayersByName($(this).text())[0].times);
    });
    times.sort();
    if (times.length > 1) {
      var startDate = isoDateToDate(times[0]);
      var endDate = isoDateToDate(times[times.length - 1]);
      $('#time-slider').data('slider').min = startDate.getTime();
      $('#time-slider').data('slider').max = endDate.getTime();
      $('#time-slider').slider('setValue',mapDate.getTime());
      $('#time-slider-min').val(startDate.format('UTC:yyyy-mm-dd'));
      $('#time-slider-max').val(endDate.format('UTC:yyyy-mm-dd'));
    }

    var rowHtml = '<tr><td title="' + lyrName + '"><div>' + lyrName + '<a href="#" title="View Data" data-name="' + lyrName + '"><img src="./img/view_data.png" /></a></div></td>';
    rowHtml += '<td class="checkbox-cell"><input type="checkbox" checked value="' + lyrName + '" /></td>';
    $('#active-layers table tbody').append(rowHtml);
    $('#active-layers input:checkbox').off('click');
    $('#active-layers input:checkbox').click(function() { 
      toggleLayerVisibility(($(this).val()));
    });
    $('#active-layers a').off('click');
    $('#active-layers a').click(function() {
      zoomToLayer(($(this).data('name')));
    });
    if (hasScrollBar($('#active-layers .table-wrapper')[0])) {
      $('#active-layers table thead th:last-child').css('width', '47px');
    }
    if (!$('#time-slider-wrapper').is(':visible')) {
      $('#time-slider-wrapper').toggle();
    }
  }
  else {
    alert('Oops.  This dataset is already on your map.');
  }
}

function hasScrollBar(div) {
    return (div.scrollHeight != div.clientHeight);
}

$(document).ready(function(){
  lyrQuery = new OpenLayers.Layer.Vector(
     'Query points'
    ,{styleMap : new OpenLayers.StyleMap({
      'default' : new OpenLayers.Style(
        OpenLayers.Util.applyDefaults({
           pointRadius       : 5
          ,strokeColor       : '#000000'
          ,strokeOpacity     : 1
          ,fillColor         : '#ff0000'
          ,fillOpacity       : 1
        })
      )
    })}
  );

  map = new OpenLayers.Map('mapView',{
    layers  : [
      new OpenLayers.Layer.XYZ(
         'ESRI Ocean'
        ,'http://services.arcgisonline.com/ArcGIS/rest/services/Ocean_Basemap/MapServer/tile/${z}/${y}/${x}.jpg'
        ,{
           sphericalMercator : true
          ,isBaseLayer       : true
          ,wrapDateLine      : true
        }
      )
      ,lyrQuery
    ]
    ,center : new OpenLayers.LonLat(-83,28).transform(proj4326,proj3857)
    ,zoom   : 5
  });

  map.events.register('click',this,function(e) {
    clearQuery();
    query(e.xy);
  });

  map.events.register('addlayer',this,function(e) {
    // keep important stuff on top
    map.setLayerIndex(e.layer,map.layers.length - 2);
  });

  $.ajax({
     url : 'http://comt.sura.org:8080/wms/datasets'
    ,dataType : 'jsonp'
    ,success : function(r) {
      // The catalog comes in as an array w/ each element containing one key (name) that points
      // to the payload.  Reduce the complexity by one and simply pump the catalog into an
      // array of objects where the name is one of the attrs.
      _.each(r,function(o) {
        var d = _.values(o)[0];
        if (d && d.storm && d.category && !_.isEmpty(d.layers) && !_.isEmpty(d.temporal)) {
          d.name = _.keys(o)[0];
          d.idx  = catalog.length;
          catalog.push(d);
        }
      });

      // Populate the options.
      var i = 0;
      _.each(_.sortBy(_.uniq(_.pluck(catalog,'category')),function(o){return o.toUpperCase()}),function(o) {
        $('#categories').append('<label class="btn btn-default ' + (i == 0 ? 'active' : '') + '"><input type="radio" name="categories" id="' + o + '" ' + (i == 0 ? 'checked' : '') + '>' + o + '</label>');
        i++;
      });

      _.each(_.sortBy(_.uniq(_.pluck(catalog,'storm')),function(o){return o.toUpperCase()}),function(o) {
        $('#event-list').append('<option value="' + o + '">' + o + '</option>');
      });
       $('#event-list').selectpicker('refresh');

      _.each(_.sortBy(_.uniq(_.pluck(catalog,'org_model')),function(o){return o.toUpperCase()}),function(o) {
        $('#model-list').append('<option value="' + o + '">' + o + '</option>');
      });
      $('#model-list').selectpicker('refresh');

      $('#categories.btn-group input').on('change', categoryClick);
      syncQueryResults();
    }
  });

  $('#time-slider').slider({
    step: 6 * 3600000,
    formater: function(value) {
      var dateTime = new Date(value);
      return dateTime.format('UTC:yyyy-mm-dd HH:00"Z"');
    },
  });
  $('#time-slider').slider().on('slideStop',function(e) {
    setDate(new Date($(this).data('slider').getValue()));
  });


  resize();
  $('.selectpicker').selectpicker({width:'auto'}).on('change', filterValueSelect);
  $('.btn').button().mouseup(function(){$(this).blur();});
  $('#active-layers button').on('click', clearMap);
  $('#clear-query').on('click', clearQuery);
  $('div.btn-group.bootstrap-select').css('width', $('ul.dropdown-menu.inner.selectpicker li').css('width'));

  var prevPt;
  $('#time-series-graph').bind('plothover',function(event,pos,item) {
    if (item) {
      var x = new Date(item.datapoint[0]);
      var y = item.datapoint[1];
      if (prevPoint != item.dataIndex) {
        $('#tooltip').remove();
        var a = item.series.label.match(/(\([^\)]*\))<\/a>/);
        if (a.length == 2) {
          var u = a.pop();
          u = u.substr(1,u.length - 2);
        }
        showToolTip(item.pageX,item.pageY,new Date(x).format('UTC:yyyy-mm-dd HH:00"Z"') + ' : ' + (Math.round(y * 100) / 100) + ' ' + u);
      }
      prevPoint = item.dataIndex;
    }
    else {
      $('#tooltip').remove();
      prevPoint = null;
    }
  });
});

function syncQueryResults() {
  $('#query-results tbody').empty();
  var i = 0;
  var c = catalog.filter(function(o) {
    var category = o.category == $('#categories.btn-group input:checked').attr('id');
    var event = $('#event-list option:selected').val() == 'ALL' || $('#event-list option:selected').val() == o.storm;
    var model = $('#model-list option:selected').val() == 'ALL' || $('#model-list option:selected').val() == o.org_model;
    return category && event && model;
  });
  _.each(_.sortBy(c,function(o){return o.name.toUpperCase()}),function(o) {
    var layers = [];
    _.each(_.keys(o.layers).sort(),function(l) {
      if (!name2Color[l]) {
        name2Color[l] = buttonClasses[_.size(name2Color) % buttonClasses.length];
      }
      layers.push('<a href="#" data-name="' + l + '" class="btn btn-' + name2Color[l] + '">' + l + '</a>');
    });
    var tSpan = '';
    var minT = o.temporal[0];
    var maxT = o.temporal[1];
    if (minT != '' && maxT != '') {
      if (isoDateToDate(minT).format('UTC:mmm d, yyyy') == isoDateToDate(maxT).format('UTC:mmm d, yyyy')) {
        tSpan = isoDateToDate(minT).format('UTC:mmm d, yyyy');
      }
      else if (isoDateToDate(minT).format('UTC:yyyy') == isoDateToDate(maxT).format('UTC:yyyy')) {
        if (isoDateToDate(minT).format('UTC:mmm') == isoDateToDate(maxT).format('UTC:mmm')) {
          tSpan = isoDateToDate(minT).format('UTC:mmm d') + ' - ' + isoDateToDate(maxT).format('UTC:d, yyyy');
        }
        else {
          tSpan = isoDateToDate(minT).format('UTC:mmm d') + ' - ' + isoDateToDate(maxT).format('UTC:mmm d, yyyy');
        }
      }
      else {
        tSpan = isoDateToDate(minT).format('UTC:mmm d, yyyy') + ' - ' + isoDateToDate(maxT).format('UTC:mmm d, yyyy');
      }
    }
    var thumb = '<img width=60 height=60 src="https://maps.googleapis.com/maps/api/staticmap?key=AIzaSyBuB8P_e6vQcucjnE64Kh2Fwu6WzhMXZzI&path=weight:1|fillcolor:0x0000AA11|color:0x0000FFBB|' + o.spatial[1] + ',' + o.spatial[0] + '|' + o.spatial[1] + ',' + o.spatial[2] + '|' + o.spatial[3] + ',' + o.spatial[2] + '|' + o.spatial[3] + ',' + o.spatial[0] + '|' + o.spatial[1] + ',' + o.spatial[0] + '&size=60x60&sensor=false" title="Data boundaries" alt="Data boundaries">';
    $('#query-results tbody').append('<tr id="row_' + i++ +'"><td title="' + o.name + '" data-idx="' + o.idx + '"><div class="thumbnail">' + thumb + '</div><div class="title">' + o.name + '</div><br /><div class="time-range"><div class="time-range-label"><span class="glyphicon glyphicon-time"></span>Time Range</div><input type="text" name="timeRange" value="' + tSpan + '" disabled class="form-control"></div><div class="download-data"><a target=_blank href="' + o.url + '" title="Download Data"><span class="glyphicon glyphicon-download"></span>Download Data</a></div>' + layers.join(', ') + '</td></tr>');
  });
  $('#results .table-wrapper td a').on('click', addToMap);

  $('ul.nav li:first-child a').on('click', function(e){
    e.preventDefault();
    if ($(this).hasClass('active'))
      return false;
    else {
      $('#mapView, #map-view-col, #map-col').hide();
      $('#catalogue').show();
      $('li.active').removeClass('active');
      $(this).parent().addClass('active');
      resize();
    }
  });

  $('ul.nav li:last-child a').on('click', function(e){
    e.preventDefault();
    if ($(this).hasClass('active'))
      return false;
    else {
      $('#catalogue').hide();
      $('#mapView, #map-view-col, #map-col').show();
      $('li.active').removeClass('active');
      $(this).parent().addClass('active');
      resize();
    }
  });
}

function isoDateToDate(s) {
  // 2010-01-01T00:00:00 or 2010-01-01 00:00:00
  s = s.replace("\n",'');
  var p = s.split(/T| /);
  if (p.length == 2) {
    var ymd = p[0].split('-');
    var hm = p[1].split(':');
    var d = new Date(
       ymd[0]
      ,ymd[1] - 1
      ,ymd[2]
      ,hm[0]
      ,hm[1]
    );
    return new Date(d.getTime() - d.getTimezoneOffset() * 60 * 1000);
  }
  else {
    return false;
  }
}

function addWMS(d) {
  _gaq.push(['_trackEvent','add layer',d.group + '-' + d.layers]);
  var lyr = new OpenLayers.Layer.WMS(
     d.group + '-' + d.layers
    ,'http://comt.sura.org:8080/wms/datasets/' + d.group + '/'
    ,{
       layers      : d.layers
      ,transparent : true
      ,styles      : d.styles
      ,format      : 'image/png'
      ,TIME        : mapDate.format('UTC:yyyy-mm-dd"T"HH:00:00')
    }
    ,{
       isBaseLayer      : false
      ,projection       : proj3857
      ,singleTile       : true
      ,wrapDateLine     : true
      ,visibility       : true
      ,opacity          : 1
      ,noMagic          : true
      ,transitionEffect : 'resize'
    }
  );
  lyr.group = d.group;
  lyr.times = d.times;
  lyr.bbox  = d.bbox;
  map.zoomToExtent(d.bbox);

  lyr.events.register('loadstart',this,function(e) {
    $('#active-layers a[data-name="' + e.object.name + '"] img').attr('src','./img/loading.gif');
  });
  lyr.events.register('loadend',this,function(e) {
    if (!e.object.activeQuery) {
      $('#active-layers a[data-name="' + e.object.name + '"] img').attr('src','./img/view_data.png');
    }
  });
  map.addLayer(lyr);
  return lyr.name;
}

function getLayerLegend(name) {
  var lyr = map.getLayersByName(name)[0];
  return lyr.getFullRequestString({
     REQUEST : 'GetLegendGraphic'
    ,LAYER   : lyr.params.LAYERS
    ,TIME    : mapDate.format('UTC:yyyy-mm-dd"T"HH:00:00')
  });
}

function toggleLayerVisibility(name) {
  var lyr = map.getLayersByName(name)[0];
  lyr.setVisibility(!lyr.visibility);
}

function zoomToLayer(name) {
  map.zoomToExtent(map.getLayersByName(name)[0].bbox);
}

function setDate(dt) {
  mapDate = dt;
  $.each($('#active-layers table tbody tr td:first-child'),function() {
    map.getLayersByName($(this).text())[0].mergeNewParams({TIME : mapDate.format('UTC:yyyy-mm-dd"T"HH:00:00')});
  });
  plot();
}

function clearMap() {
  clearQuery();
  $.each($('#active-layers table tbody tr td:first-child'),function() {
    map.removeLayer(map.getLayersByName($(this).text())[0]);
  });
  $('#active-layers table tbody tr').remove();
  $('#active-layers table thead th:last-child').css('width', '30px');
  if ($('#time-slider-wrapper').is(':visible')) {
    $('#time-slider-wrapper').toggle();
  }
  mapDate = false;
}

function clearQuery() {
  plotData = [];
  plot();
  lyrQuery.removeAllFeatures();
}

function query(xy) {
  plotData = [];
  var lonLat = map.getLonLatFromPixel(xy);
  var f = new OpenLayers.Feature.Vector(
    new OpenLayers.Geometry.Point(lonLat.lon,lonLat.lat)
  );
  lyrQuery.addFeatures([f]);
  _.each(_.filter(map.layers,function(o){return o.DEFAULT_PARAMS && o.visibility}),function(l) {
    l.events.triggerEvent('loadstart');
    var u = l.getFullRequestString({
       REQUEST      : 'GetFeatureInfo'
      ,INFO_FORMAT  : 'text/javascript'
      ,QUERY_LAYERS : l.params.LAYERS
      ,BBOX         : map.getExtent().toBBOX()
      ,WIDTH        : map.size.w
      ,HEIGHT       : map.size.h
      ,X            : Math.round(xy.x)
      ,Y            : Math.round(xy.y)
      ,TIME         : new Date($('#time-slider').data('slider').min).format('UTC:yyyy-mm-dd"T"HH:00:00') + '/' + new Date($('#time-slider').data('slider').max).format('UTC:yyyy-mm-dd"T"HH:00:00')
    });
    l.activeQuery = true;
    $.ajax({
       url      : u
      ,dataType : 'jsonp'
      ,v        : l.params.LAYERS
      ,title    : l.name
      ,timeout  : 30000 // JSONP won't trap errors natively, so use a timeout.
      ,success  : function(r) {
        _gaq.push(['_trackEvent','query layer - OK',this.title]);
        var lyr = map.getLayersByName(this.title)[0];
        if (lyr) {
          lyr.activeQuery = false;
          lyr.events.triggerEvent('loadend');
        }
        // special case for u,v
        if (this.v == 'u,v' && r.properties['u'] && r.properties['v']) {
          var d = {
             data  : []
            ,vData : []
            ,label : '<a target=_blank href="' + this.url + '">' + '&nbsp;' + this.title + ' (' + r.properties['u'].units + ')' + '</a>'
          };
          for (var i = 0; i < r.properties.time.values.length; i++) {
            var u = r.properties['u'].values[i];
            var v = r.properties['v'].values[i];
            var spd = Math.sqrt(Math.pow(u,2) + Math.pow(v,2));
            var dir = Math.atan2(u,v) * 180 / Math.PI;
            dir += dir < 0 ? 360 : 0;
            d.data.push([isoDateToDate(r.properties.time.values[i]).getTime(),spd]);
            d.vData.push([isoDateToDate(r.properties.time.values[i]).getTime(),dir]);
          }
          d.color = lineColors[plotData.length % lineColors.length][0];
          plotData.push(d);
        }
        else if (r.properties[this.v]) {
          var d = {
             data  : []
            ,label : '<a target=_blank href="' + this.url + '">' + '&nbsp;' + this.title + ' (' + r.properties[this.v].units + ')' + '</a>'
          };
          for (var i = 0; i < r.properties.time.values.length; i++) {
            var val = _.isUndefined(r.properties[this.v].values[i]) ? r.properties[this.v].values[0] : r.properties[this.v].values[i];
            d.data.push([isoDateToDate(r.properties.time.values[i]).getTime(),val]);
          }
          d.color = lineColors[plotData.length % lineColors.length][0];
          plotData.push(d); 
        }
        plot();
      }
      ,error    : function(r) {
        _gaq.push(['_trackEvent','query layer - ERROR',this.title]);
        var lyr = map.getLayersByName(this.title)[0];
        if (lyr) {
          lyr.activeQuery = false;
          lyr.events.triggerEvent('loadend');
        }
        var d = {
           data  : []
          ,label : '<a target=_blank href="' + this.url + '">' + '&nbsp;' + this.title + ' <font color=red><b>ERROR</b></font>'
        };
        d.color = lineColors[plotData.length % lineColors.length][0];
        plotData.push(d);
        plot();
      } 
    });
  });
}

function plot() {
  $('#time-series-graph').empty();
  if (_.size(plotData) > 0) {
    var plot = $.plot(
       $('#time-series-graph')
      ,plotData
      ,{
         xaxis     : {mode  : "time"}
        ,crosshair : {mode  : 'x'   }
        ,grid      : {
           backgroundColor : {colors : ['#fff','#eee']}
          ,borderWidth     : 1
          ,borderColor     : '#99BBE8'
          ,hoverable       : true
          ,markings        : [{color : '#0e90d2',lineWidth : 2,xaxis : {from : mapDate.getTime(),to : mapDate.getTime()}}]
        }
        ,zoom      : {interactive : false}
        ,pan       : {interactive : false}
        ,legend    : {backgroundOpacity : 0.3}
      }
    );

    // go back and plot any vectors
    var imageSize = 80;
    _.each(plotData,function(d) {
      if (d.vData) {
        var c = _.find(lineColors,function(o){return o[0] == d.color})[1];
        // assume 1:1 for u:v
        for (var i = 0; i < d.data.length; i++) {
          var o = plot.pointOffset({x : d.data[i][0],y : d.data[i][1]});
          $('#time-series-graph').prepend('<div class="dir" style="position:absolute;left:' + (o.left-imageSize/2) + 'px;top:' + (o.top-(imageSize/2)) + 'px;background-image:url(\'./img/arrows/' + imageSize + 'x' + imageSize + '.dir' + Math.round(d.vData[i][1]) + '.' + c.replace('#','') + '.png\');width:' + imageSize + 'px;height:' + imageSize + 'px;"></div>');
        }
      }
    });
  }
}

function showToolTip(x,y,contents) {
  $('<div id="tooltip">' + contents + '</div>').css({
     position           : 'absolute'
    ,display            : 'none'
    ,top                : y + 10
    ,left               : x + 10
    ,border             : '1px solid #99BBE8'
    ,padding            : '2px'
    ,'background-color' : '#fff'
    ,opacity            : 0.80
    ,'z-index'          : 10000001
  }).appendTo("body").fadeIn(200);
}
