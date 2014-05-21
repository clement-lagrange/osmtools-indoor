
  /**
   * BUILDINGS
   * -----------------------------------------------------------------------------
   */

  var building = {};


  building.outline = function(coords) {
    //this.id = id;
    this.coords = coords;
    this.relationId;
    this.name;

    /** Draw outline with popup "Enter..." **/
    this.draw = function() {
     new L.Polygon(this.coords)
          .addTo(api.layer.outlines)
          .on('click', function() {
                api.loadBuilding(this.relationId, this);
          }, this);

      new L.marker(this.center())
              .addTo(api.layer.pins)
              .on('click', function() {
                map.setView(this.getLatLng(), 17);
              });
    }
	
	this.drawInside = function(){
		new L.Polygon(this.coords,{color:'#B7C0BF',opacity:'1',fillOpacity:'1'}).addTo(api.layer.building).bringToBack();
	}
	  

    /** Center of outline **/
    this.center = function() {
      var sumLat = 0, sumLon = 0;
      for (var i in this.coords) {
        sumLat += this.coords[i].lat;
        sumLon += this.coords[i].lng;
      }
      return new L.LatLng(sumLat / this.coords.length, sumLon / this.coords.length);
    }
  }
  
  
 

  building.building = function(id, name, levels, outline) {
    this.id = id;
    this.name = name;
    this.outline = outline;
    this.levels = levels.sort(function(a, b){ return a.level.localeCompare( b.level) } );
    this.shell;

    this.levelIds = new Array();
    this.levels.forEach(function(l){
        this.levelIds[l.id] = l.level;
    }, this );

  this.currentType = 'All';

  this.addNumToString = function(n){
	return (parseInt(api.building.currentLevel)+n).toString()
  }
  this.currentLevel = this.levels[0].level;
  this.getLevelPerId = function(idRoom){
	var arr = [] ;
	api.building.levels.forEach(function(l){
		l.rooms.forEach(function(r){
			if(idRoom == r.id)
				arr.push(l.level);
		})
	})
	return arr.sort();
  }
  /** Return level n **/
  this.getLevel = function(n) {
    return this.levels.filter(function(l){ return ((l.level == n) || (l.id == n)) ; }).pop();
  }

  this.draw = function() {
    this.drawLevelSwitcher();
    if (this.drawLevel()) {
      $('#indoor-navigation').show();
      $('.tools').show();
    }
  };

  /** Draw level n and write list of rooms **/
  this.drawLevel = function(n) {
    if (typeof n === 'undefined') { n = this.currentLevel; }
    var level = this.getLevel(n);
    if (level != undefined) {
      api.layer.building.clearLayers();
      api.layer.decoration.clearLayers();
      if(typeof api.all_outlines[this.id] !== "undefined" && api.all_outlines[this.id] != null ){
  	api.all_outlines[this.id].forEach(function(o){o.drawInside() ;});
      }
      api.room = null ;
      level.draw();
      map.closePopup();
	  map.setZoom(map.getZoom());
      $('#indoor-rooms').html(level.list());
      api.building.currentLevel = n;
      api.building.updateLevelSwitcher();

      api.layer.reloadBuilding();
      return true;
    }
    alert("Something went wrong (no level " + n + ")!");
    //api.loadShell();
    return false;
  };

    /**
     * Draw level switcher
     */
    this.drawLevelSwitcher = function() {
      //add text
      $('#indoor-navigation h3').text(this.name);
      $('#indoor-escape button').attr('title', translate('Close'));
      $('#indoor-list-btn button').attr('title', translate('Show list of rooms'));

      var txt = '<div class="btn-group" data-toggle="buttons">';
      api.building.levels.forEach(function(level) {
        l = level.level ;
        txt += '<label class="btn" id="indoor-levels-' + l + '" onclick="api.building.drawLevel(' + l + ');"><input type="radio">' + l + '</label>';
      });
      txt += '</div>';
      $("#indoor-levels").html(txt);
    };
    
    
    this.updateLevelSwitcher = function(){
    	api.building.levels.forEach(function(l) {
          $('#indoor-levels-'+l.level).removeClass('active');  
	});	
    	$('#indoor-levels-'+api.building.currentLevel).addClass('active');  	
    }

    /** Show popup for selected room in the list. Here because of shorter addr. **/
    this.popup = function(level_, room_) {
	  var ok = false; 
	  var cpt = 0;
      var level = api.building.getLevel(level_);
	  var room;
	  while(!ok && cpt < level.rooms.length){
	 
		if(level.rooms[cpt].ref == room_){
			ok = true;
			room = level.rooms[cpt];
			
		}
		api.room = room_ ;
		cpt++;	
	  
	  }
      
      map.setView(room.center());
	  L.popup()
              .setLatLng(room.center(room))
              .setContent(room.label()) 
              .openOn(map);
			  
    };
	
  }
  
  
  
  building.level = function(id, level, rooms) {
    this.id = id;
    this.level = level;

    this.rooms = rooms;
    this.pois = new Array();

    this.shell; //@TODO
    this.coords;
    this.name = "?";
    
  
	
    /** Write list of all room on level **/
    this.list = function() {
	var tmp = new Array();
	for(var k in this.rooms){
	if(this.rooms[k].ref != null || this.rooms[k].name != null)
	tmp.push(this.rooms[k]);
	
	}

	
      tmp.sort(function(a, b) {
        var nameA, nameB;
		var refA, refB;
			if (a.name == null && b.name == null && a.ref != null && b.ref != null){
			  refA = a.ref.toLowerCase();
			  refB = b.ref.toLowerCase();
			  
			  if (refA < refB){
				return -1;
				}
			  if (refA > refB){
				return 1;}
			}else{
			if (a.name == null)
			  nameA = "~";
			else
			  nameA = a.name.toLowerCase();
			if (b.name == null)
			  nameB = "~";
			else
			  nameB = b.name.toLowerCase();
			if (nameA < nameB)
			  return -1;
			if (nameA > nameB)
			  return 1;
			}

		  
        return 0;
      });
	  
	  

      var txt = '';
	
      for (var i in tmp)
        if (tmp[i] != null && tmp[i].label() != null)
          if (api.building.currentType == 'All' || tmp[i].category == api.building.currentType)
            txt += '<div class="indoor-list-room" onclick="api.building.popup(' + this.id + ',\'' + tmp[i].ref + '\')">' + tmp[i].label() + '</div>';
			
		  
			
      if (txt == '') {
        if (api.building.currentType == 'All')
          txt += '<em>' + translate('Empty floor') + '</em>';
        else
          txt += '<em>' + translate('None on this floor') + '</em>';
      }

      return txt;
    };

    /** Draw level **/
    this.draw = function() {
//      api.layer.building.clearLayers();
      for (var i in this.rooms)
        if (this.rooms[i] !== null)
          this.rooms[i].draw();
      for (var i in this.pois)
        if (this.pois[i] !== null)
          this.pois[i].draw();
    };
  };

  building.room = function(id, coords) {
    this.id = id;
    this.coords = coords;
    this.name;
    this.ref;

    this.type;      // corridor,room...
    this.category;  // fashion,home,health...
    this.shop;      // value of amenity=* or shop=*
    this.access;
    this.contact = {};
    this.opening_hours;
    this.polygon;
	

    /** Draw room **/
    this.draw = function() {
      var helper = this;
      var coor = this.coords
      if (this.inner != undefined)
        coor = [this.coords, this.inner];

      this.polygon = new L.Polygon(coor, {
        smoothFactor: 0.2,
        clickable: this.clickable(),
        weight: this.weight(),
        color: this.color(),
        fillOpacity: 0.4
      })
              .bindLabel(this.label())
              .addTo(api.layer.building)
              .on('click', function() {
                helper.modal();
              });
	if (this.label() != null) {
		L.marker(this.center(),  {clickable: false, icon: L.divIcon({className: 'null', html: '<span style="color:black">'+this.label(false)+'</span>'}) }).addTo(api.layer.decoration);
	} ;
	if(this.shop == "toilets"){
		L.marker(this.center(), {clickable:false, icon: L.icon({iconUrl: 'img/toilets.png', iconSize:[20,20]})}).addTo(api.layer.decoration);
	};
	if(this.type == "verticalpassage"){
		var room = this ;
		L.marker(this.center(), {clickable:true, icon: L.icon({iconUrl: 'img/stairs.png', iconSize:[30,30]})}).addTo(api.layer.decoration).on('click', function() {
		var content = "";	
			
			if(api.building.getLevelPerId(room.id).indexOf(api.building.addNumToString(1)) != -1)
				content = content + '<button onclick="api.building.drawLevel(api.building.addNumToString(1));map.closePopup()">'+translate('Go Up')+'</button>';
			if(api.building.getLevelPerId(room.id).indexOf(api.building.addNumToString(-1)) != -1)
				content = content + '<button onclick="api.building.drawLevel(api.building.addNumToString(-1));map.closePopup()">'+translate('Go Down')+'</button>';
			if(content =="")
				content= translate('This stairway goes nowhere') ;
			L.popup().setLatLng(room.center(room)).setContent(content).openOn(map);
		})
	};
	if(this.access == "emergency" && this.type == "verticalpassage"){
		L.marker(this.center(), {clickable:false, icon: L.icon({iconUrl: 'img/sortie_secours.png', iconSize:[30,30]})}).addTo(api.layer.decoration);
	};
	if(this.type == "elevator"){
		L.marker(this.center(), {clickable:false, icon: L.icon({iconUrl: 'img/elevator.png', iconSize:[30,30]})}).addTo(api.layer.decoration);
	} ;
	if(this.shop == "bicycle_parking"){
		L.marker(this.center(), {clickable:false, icon: L.icon({iconUrl: 'img/parking_velos.png', iconSize:[30,30]})}).addTo(api.layer.decoration);
	};
     // if (this.type == "corridor")
     //   this.polygon;//.bringToBack();

      for (var i in this.coords) {
        if (this.coords[i].entrance == 'main') {
          new L.circleMarker(this.coords[i], {
            radius: 3,
            weight: 2,
            clickable: false,
            color: 'blue',
            fillOpacity: 1
          })
                  .addTo(api.layer.building);
        }
        if (this.coords[i].entrance != null) {
          new L.circleMarker(this.coords[i], {
            radius: (this.coords[i].entrance == 'main') ? 4 : 2,
            weight: 2,
            clickable: false,
            color: 'green',
            fillOpacity: 1
          })
                  .addTo(api.layer.decoration);
        }
        if (this.coords[i].door != null) {
          new L.circleMarker(this.coords[i], {
            radius: 2,
            weight: 2,
            clickable: false,
            color: '#666',
            fillOpacity: 0.8
          })
                  .addTo(api.layer.decoration);
        }
      }
    }

    //formatted label
    this.label = function(color) {
      var txt = "";
      if ( typeof color === 'undefined') { txt = '<span style="color:' + this.color() + '">■</span> ' } ;
      if (this.name != undefined && this.ref != undefined)
        return txt + this.name + ' (' + this.ref + ')';
      if (this.name == undefined && this.ref != undefined)
        return txt + this.ref;
      if (this.name != undefined)
        return txt + this.name;
      return null;
    }

    this.modal = function() {
	if( this.name != null)
      $('#indoor-window-header').html(this.name);
	  else
	  $('#indoor-window-header').html(this.ref);

      // Text to be displayed in modal window
      var window_text = "<h4>Informations :</h4>";


      $('#indoor-window-text').html(window_text);


      $('#indoor-window').modal();
    }

    /** Color for room **/
    this.color = function() {
      switch (this.type) {
        case 'corridor':
          {
            if (this.access == "private")
              return '#bb9696';
            return '#FCFAE1';
          }
        case 'verticalpassage':
          return '#5C0515';
        case 'room':
          {
            if (this.access == "private")
              return '#997a7a';
            else
              return '#B9121B';
          }

      }
      return '#aaa';
    }

    /** Click or not **/
    this.clickable = function() {
      if (this.type == 'corridor')
        return false;
      if (this.name == null && this.ref == null)
        return false;
      return true;
    }

    /** Color for room **/
    this.weight = function() {
      switch (this.type) {
        case 'corridor':
          return 1;
        case 'verticalpassage':
          return 0;
      }
      return 2;
    }

    /** Center of room outline **/
    this.center = function() {
      var sumLat = 0, sumLon = 0;
      for (var i in this.coords) {
        sumLat += this.coords[i].lat;
        sumLon += this.coords[i].lng;
      }
      return new L.LatLng(sumLat / this.coords.length, sumLon / this.coords.length);
    }
  }

  building.poi = function(id, coords, type, name) {
    this.id = id;
    this.coords = coords;
    this.type = type;
    this.name = name;

    this.marker = new L.marker([this.coords.lat, this.coords.lng]);
    this.circle = new L.circle([this.coords.lat, this.coords.lng], 0.5, {
      weight: 2,
      color: '#666',
      fillOpacity: 0.4
    });
    this.current;

    this.icon = function() {
      switch (this.type) {
        case 'atm' :
          return 'img/pois/atm.png';
        case 'office' :
          return 'img/pois/info.png';
        case 'telephone' :
          return 'img/pois/tel.png';
        case 'vending_machine' :
          return 'img/pois/vmachine.png';
        default :
          return null;
      }
    }

    this.draw = function() {
      var helper = this;
      //circle - no name
      if (this.icon() == null || map.getZoom() < 20) {
        if (this.current != 2) {
          this.current = 2;
          api.layer.building.removeLayer(this.marker);
          this.circle.addTo(api.layer.building);
          this.circle.on('click', function() {
            helper.modal()
          });
        }
      } else {
        if (this.current != 1) {
          this.current = 1;
          api.layer.building.removeLayer(this.circle);
          this.marker.setIcon(L.icon({
            iconUrl: this.icon(),
            iconSize: [16, 16],
            iconAnchor: [8, 8]
          }));
          this.marker.bindLabel(this.name);
          this.marker.addTo(api.layer.building);
          this.marker.on('click', function() {
            helper.modal()
          });
        }
      }
    }

    this.modal = function() {
      $('#indoor-window-header').html(this.name == undefined ? "<em>no name</em>" : this.name);
      $('#indoor-window-text').html("<h4>Type</h4>" + this.type);
      $("#indoor-window-link").attr("href", "http://www.openstreetmap.org/browse/node/" + this.id);

      var href = "http://localhost:8111/load_and_zoom";
      href += "?left=" + String(parseFloat(this.coords.lng) - 0.001);
      href += "&right=" + String(parseFloat(this.coords.lng) + 0.001);
      href += "&top=" + String(parseFloat(this.coords.lat) + 0.001);
      href += "&bottom=" + String(parseFloat(this.coords.lat) - 0.001);
      href += "&select=node" + this.id;

      $("#indoor-window-josm").click(function() {
        if (document.exitFullscreen)
          document.exitFullscreen();
        else if (document.mozCancelFullScreen)
          document.mozCancelFullScreen();
        else if (document.webkitCancelFullScreen)
          document.webkitCancelFullScreen();
        $('#josm-iframe').attr("src", href);
      });

      $('#indoor-window').modal();
    }
  }

