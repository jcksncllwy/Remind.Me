// An example Backbone application contributed by
// [Jérôme Gravel-Niquet](http://jgn.me/). This demo uses a simple
// [LocalStorage adapter](backbone-localstorage.html)
// to persist Backbone models within your browser.

// Load the application once the DOM is ready, using `jQuery.ready`:
$(function(){
	var userLocation;
	navigator.geolocation.getCurrentPosition(setLocation);
	
	function setLocation(location){
		userLocation = location;
	}

  // Todo Model
  // ----------

  // Our basic **Todo** model has `text`, `order`, and `done` attributes.
  window.Todo = Backbone.Model.extend({

    // Default attributes for a todo item.
    defaults: function() {
      return {
        done:  false,
        order: Todos.nextOrder(),
		locationOrder: Todos.locationOrder()
      };
    },

    // Toggle the `done` state of this todo item.
    toggle: function() {
      this.save({done: !this.get("done")});
    }

  });

  // Todo Collection
  // ---------------

  // The collection of todos is backed by *localStorage* instead of a remote
  // server.
  window.TodoList = Backbone.Collection.extend({

    // Reference to this collection's model.
    model: Todo,

    // Save all of the todo items under the `"todos"` namespace.
    localStorage: new Store("todos"),

    // Filter down the list of all todo items that are finished.
    done: function() {
      return this.filter(function(todo){ return todo.get('done'); });
    },

    // Filter down the list to only todo items that are still not finished.
    remaining: function() {
      return this.without.apply(this, this.done());
    },

    // We keep the Todos in sequential order, despite being saved by unordered
    // GUID in the database. This generates the next order number for new items.
    nextOrder: function() {
      if (!this.length) return 1;
      return this.last().get('order') + 1;
    },

	locationOrder: function() {
		
	},
	
    // Todos are sorted by their original insertion order.
    comparator: function(todo) {
      return todo.get('order');
    }

  });

  // Create our global collection of **Todos**.
  window.Todos = new TodoList;

  // Todo Item View
  // --------------

  // The DOM element for a todo item...
  window.TodoView = Backbone.View.extend({

    //... is a list tag.
    tagName:  "li",

    // Cache the template function for a single item.
    template: _.template($('#item-template').html()),

    // The DOM events specific to an item.
    events: {
     //the left hand side are DOM events, right side function 
      "click .check"              : "toggleDone",
      "dblclick div.todo-text"    : "edit",
      "click span.todo-time"      : "toggleTime",
	  "click span.todo-location"  : "toggleLocation",
      "click span.todo-destroy"   : "clear",
      "keypress .todo-input"      : "updateOnEnter",
	  "click button.addPlace"	  : "addPlace",
	  "click button.removePlace"  : "removePlace"
	 // "click button.addTime"      : "addTime"
    },

    // The TodoView listens for changes to its model, re-rendering.
    initialize: function() {
      this.model.bind('change', this.render, this);
      this.model.bind('destroy', this.remove, this);
    },

    // Re-render the contents of the todo item.
    render: function() {
      $(this.el).html(this.template(this.model.toJSON()));
      this.setText();
	  if($(this.el).hasClass("editingLocation")){
		this.closeLocation();
	  }
      return this;
    },

    // To avoid XSS (not that it would be harmful in this particular app),
    // we use `jQuery.text` to set the contents of the todo item.
    setText: function() {
      var text = this.model.get('text');
      this.$('.todo-text').text(text);
      this.input = this.$('.todo-input');
      this.input.bind('blur', _.bind(this.close, this)).val(text);
    },

    // Toggle the `"done"` state of the model.
    toggleDone: function() {
      this.model.toggle();
    },

    // Switch this view into `"editing"` mode, displaying the input field.
    edit: function() {
      $(this.el).addClass("editing");
      this.input.focus();
    },
	
	
	//Time-Related functions...
	toggleTime: function() {
		if($(this.el).hasClass("editingTime")){
			this.closeTime();
		}
		else{
			this.editTime();
		}
	},
	
	editTime: function() {
		$(this.el).addClass("editingTime");
		this.renderTime();
	},
	
	closeTime: function() {
		$(this.el).removeClass("editingTime");
		$(".timeInput").remove();

	},
	
	
	//Location-Related functions...
	toggleLocation: function() {
		if($(this.el).hasClass("editingLocation")){
			this.closeLocation();
		}
		else{
			this.editLocation();
		}
	},
	
	editLocation: function() {
		$(this.el).addClass("editingLocation");
		this.renderMap();
	},

    // Close the `"editing"` mode, saving changes to the todo.
    close: function() {
      this.model.save({text: this.input.val()});
      $(this.el).removeClass("editing");
    },
	
	closeLocation: function() {
      $(this.el).removeClass("editingLocation");
	  this.$(".map_canvas").remove();
	  this.$(".searchTextField").remove();
    },
	
	
	addTime: function(e){
		var todoTime = e.target.name;
		var todoRef = e.target.id;
	},
	
	addPlace: function(e){
		var placeRef = e.target.id;
		var placeId = e.target.name;
		console.log('derp' + placeId);
		this.model.save({location: placeRef});
		this.model.save({locationId: placeId});
	},
	
	removePlace: function(e){
		this.model.save({location: undefined});
	},

    // If you hit `enter`, we're through editing the item.
    updateOnEnter: function(e) {
      if (e.keyCode == 13) this.close();
    },

    // Remove this view from the DOM.
    remove: function() {
      $(this.el).remove();
    },

    // Remove the item, destroy the model.
    clear: function() {
      this.model.destroy();
    },
	
	renderTime: function() {
		var model = this.model;
		
		this.$(".timeBlock").append("<input type='text' class='timeInput'  size='20' value= 'Enter a Time'>");
		if(this.model.has('time')){
			var time = model.get('time');
			if(time!=undefined){
				this.$('.timeInput').val(time);
			}
		}	
		this.$('.timeInput').datetimepicker({
			ampm: true,
			onClose: function(dateText, inst){
				model.save({time:dateText});
			}
		});
		
	},
	
	
	renderMap: function() {
		var model = this.model;
		var contentWidth = $('.content').css('width');
		this.$(".location").append("<input class='searchTextField' type='text' size='50'>");
		this.$(".location").append("<div style='height: 480px; width: "+contentWidth+"' class='map_canvas'></div>");
		var mapOptions = {
            center: new google.maps.LatLng(userLocation.coords.latitude, userLocation.coords.longitude),
            zoom: 17,
            mapTypeId: google.maps.MapTypeId.ROADMAP
        };
        var map = new google.maps.Map(this.$(".map_canvas")[0], mapOptions);
		var input = this.$(".searchTextField")[0];
        var autocomplete = new google.maps.places.Autocomplete(input);
		var service = new google.maps.places.PlacesService(map);
        autocomplete.bindTo('bounds', map);
		var markerList = new Array();
		var infoWindowList = new Array();
				
		/*
		google.maps.event.addListener(map, 'bounds_changed', function (){
			if(input.value && input.value!=''){
				google.maps.event.trigger(autocomplete, 'place_changed');
			}
		});
		*/
		function createMarker(placeResult){
			var marker = new google.maps.Marker({
				map: map
			});
			marker.setPosition(placeResult.geometry.location);
			google.maps.event.addListener(marker, 'click', function(){
				map.setCenter(marker.getPosition());
			});
			createInfoWindow(placeResult, marker);
			return marker;
		}
		
		function createInfoWindow(place, marker){
			var infowindow = new google.maps.InfoWindow();
			var address = '';
			if (place.address_components) {
				address = [(place.address_components[0] && place.address_components[0].short_name || ''), (place.address_components[1] && place.address_components[1].short_name || ''), (place.address_components[2] && place.address_components[2].short_name || '')].join(' ');
			}
			infowindow.setContent('<div><strong>' + place.name + '</strong><br>' + address + '<br /><button class="addPlace" name="'+place.id+'" id='+place.reference+'>Set Place</button>');
			if(model.has('locations')){
				var locationId = model.get('locationId');
				if(locationId == place.id){
					infowindow.setContent(infowindow.getContent()+'<button class="removePlace" name="'+place.name+'" id='+place.reference+'>Remove Place</button>');
				}
			}
			google.maps.event.addListener(marker, 'click', function(){
				for(var i = 0; i<infoWindowList.length; i++){
					infoWindowList[i].close();
				}
				infowindow.open(map, marker);
			});
		}
		
		var expandSearch = function(){
			
			searchRequest = {
				bounds: map.getBounds(),
				keyword: input.value
			};
			function searchCallback(results, status) {
				if (status == google.maps.places.PlacesServiceStatus.OK) {
					for (var i = 0; i < results.length; i++) {
						createMarker(results[i]);
					}
				}
			}
			
		};
		
		google.maps.event.addListener(map, 'bounds_changed', function (){
			if(input.value && input.value!=''){
				expandSearch();
			}
		});
		
		google.maps.event.addListener(autocomplete, 'place_changed', function () {
			var place = autocomplete.getPlace();
			if(place.id==undefined){
				searchCompleted = false;
				searchRequest = {
					bounds: map.getBounds(),
					keyword: input.value
				};
				function searchCallback(results, status) {
					var resultsBounds = new google.maps.LatLngBounds();
					console.log(status);
					if (status == google.maps.places.PlacesServiceStatus.OK) {
						for (var i = 0; i < results.length; i++) {
							createMarker(results[i]);
							resultsBounds.extend(results[i].geometry.location);
							map.fitBounds(resultsBounds);
						}
					}
					else{
						console.log(results);
					}
					searchCompleted = true;
				}
				console.log(searchRequest);
				service.search(searchRequest,searchCallback);
			}
            else{
				if (place.geometry.viewport) {
					map.fitBounds(place.geometry.viewport);
				}
				else {
					map.setCenter(place.geometry.location);
					map.setZoom(17); // Why 17? Because it looks good.
				}
				var marker = createMarker(place);
			}
        });
		
		if(this.model.has('location')){
			var location = this.model.get('location');
			if(location!=undefined){
				var placeDetailsRequest;
				placeDetailsRequest = {reference: location};
				service.getDetails(placeDetailsRequest,
				function(placeResult,placesServiceStatus){
					createMarker(placeResult);
					map.setCenter(placeResult.geometry.location);
				});
			}
		}
	},
	
	showMap: function(){
	
	},
	
	hideMap: function(){
	
	}
	
  });

  // The Application
  // ---------------

  // Our overall **AppView** is the top-level piece of UI.
  window.AppView = Backbone.View.extend({

    // Instead of generating a new element, bind to the existing skeleton of
    // the App already present in the HTML.
    el: $("#todoapp"),

    // Our template for the line of statistics at the bottom of the app.
    statsTemplate: _.template($('#stats-template').html()),

    // Delegated events for creating new items, and clearing completed ones.
    events: {
      "keypress #new-todo":  "createOnEnter",
      "keyup #new-todo":     "showTooltip",
      "click .todo-clear a": "clearCompleted"
    },

    // At initialization we bind to the relevant events on the `Todos`
    // collection, when items are added or changed. Kick things off by
    // loading any preexisting todos that might be saved in *localStorage*.
    initialize: function() {
      this.input    = this.$("#new-todo");

      Todos.bind('add',   this.addOne, this);
      Todos.bind('reset', this.addAll, this);
      Todos.bind('all',   this.render, this);

      Todos.fetch();
    },

    // Re-rendering the App just means refreshing the statistics -- the rest
    // of the app doesn't change.
    render: function() {
      this.$('#todo-stats').html(this.statsTemplate({
        total:      Todos.length,
        done:       Todos.done().length,
        remaining:  Todos.remaining().length
      }));
    },

    // Add a single todo item to the list by creating a view for it, and
    // appending its element to the `<ul>`.
    addOne: function(todo) {
      var view = new TodoView({model: todo});
      $("#todo-list").append(view.render().el);
    },

    // Add all items in the **Todos** collection at once.
    addAll: function() {
      Todos.each(this.addOne);
    },

    // If you hit return in the main input field, and there is text to save,
    // create new **Todo** model persisting it to *localStorage*.
    createOnEnter: function(e) {
      var text = this.input.val();
      if (!text || e.keyCode != 13) return;
      Todos.create({text: text});
      this.input.val('');
    },

    // Clear all done todo items, destroying their models.
    clearCompleted: function() {
      _.each(Todos.done(), function(todo){ todo.destroy(); });
      return false;
    },

    // Lazily show the tooltip that tells you to press `enter` to save
    // a new todo item, after one second.
    showTooltip: function(e) {
      var tooltip = this.$(".ui-tooltip-top");
      var val = this.input.val();
      tooltip.fadeOut();
      if (this.tooltipTimeout) clearTimeout(this.tooltipTimeout);
      if (val == '' || val == this.input.attr('placeholder')) return;
      var show = function(){ tooltip.show().fadeIn(); };
      this.tooltipTimeout = _.delay(show, 1000);
    }

  });

  // Finally, we kick things off by creating the **App**.
  window.App = new AppView;

});
