function listSubmittedEntries() {
	if (localStorage.submittedEntries) {
		var entries = JSON.parse(localStorage.submittedEntries);
		$.each(entries, function(key, val) {
			$("#list-submitted-entries").empty();
			$("<li><a  id='" + val.timestamp + "'>" + val.timestamp + "</a></li>").appendTo("#list-submitted-entries");
		});
	} else {
		$("<li>Du har inga sparade checklistor att ladda upp</li>").appendTo("#list-submitted-entries");
	}
	$('#list-submitted-entries ul').listview().listview('refresh');
}

function listPreviousSubmissions() {
	if (localStorage.previousSubmissions) {
		$.each(JSON.parse(localStorage.previousSubmissions), function(key, val) {
			var i = 0;
			if (i == 5) {
				return false;
			}
			var datetime = new Date(val.timestamp + 3600 * 1000);
			datetime = datetime.toISOString();
			$("<li><a id='" + val.form_id + "' class='previousSubmissionObject' name=" + val.timestamp + "><h3>" + val.form_name + "</h3><p>Sparad: " + prettyDate(datetime) + "</p></a></li>").appendTo("#list-all-previous-submissions");
			i++;
		});
		$('#list-all-previous-submissions').listview().listview('refresh');
	}
}

function repopulateForm(previousSubmission) {
	// console.log(previousSubmission);
	$.each(previousSubmission, function(name, val) {
		var $el = $('[name="' + name + '"]'),
			type = $el.attr('type');
		switch (type) {
		case 'checkbox':
			if (val instanceof Array) {
				$.each(val, function(entry, value) {
					$el.filter('[value="' + value + '"]').attr('checked', 'checked');
				});
			} else {
				$el.filter('[value="' + val + '"]').attr('checked', 'checked');
			}
			break;
		case 'radio':
			$el.filter('[value="' + val + '"]').attr('checked', 'checked');
			break;
		default:
			$el.val(val);
		}
	});
}

function displayChecklist(checklistJson, previousSubmission) {
	console.log(previousSubmission);
	var create_form = $("#myform").dform(checklistJson);
	create_form.promise().done(function() {
		$("input:file").after(function() {
			return "<img id='image" + $(this).attr("id") + "'>";
		});
		if (checklistJson["name"]) {
			console.log(checklistJson["name"]);
			$("#checklist-name").html(checklistJson["name"]);
		}
		$.dform.addType("h2", function(options) {
			// Return a new button element that has all options that
			// don't have a registered subscriber as attributes
			return $("<h2>").dform('attr', options);
		});
		$.dform.addType("h1", function(options) {
			// Return a new button element that has all options that
			// don't have a registered subscriber as attributes
			return $("<h1>").dform('attr', options);
		});
		$.dform.addType("textarea", function(options) {
			// Return a new button element that has all options that
			// don't have a registered subscriber as attributes
			return $("<textarea>").dform('attr', options);
		});
		$.dform.addType('text', function(options) {
			return $(this).wrap('<div >').attr('data-mini', 'true').parent();
		});
		$.dform.addType('file', function(options) {
			return $(this).wrap('<div >').attr('data-mini', 'true').attr('accept', 'image/*').attr('capture', 'camera').parent();
		});
		$('#formpage').trigger('create'); //apply jquery mobile styling
		$.mobile.navigate("#formpage"); //go to form page
		if (previousSubmission == undefined) {
			//console.log("previousSubmission is undefined!");
		} else {
			repopulateForm(previousSubmission);
		}
	});
}
//polyfill to see if string begins with another string. 
if (!String.prototype.startsWith) {
	Object.defineProperty(String.prototype, 'startsWith', {
		enumerable: false,
		configurable: false,
		writable: false,
		value: function(searchString, position) {
			position = position || 0;
			return this.lastIndexOf(searchString, position) === position;
		}
	});
}

function storePreviousSubmission(submittedEntryJson) {
	$.each(submittedEntryJson, function(key, val) {
		//delete any image base64 data
		if (val['name'].startsWith("imagedata")) {
			delete submittedEntryJson[key];
		}
	});
	//massage serializeArray output into form name/value format.
	var o = {};
	var a = submittedEntryJson;
	$.each(a, function() {
		if (o[this.name] !== undefined) {
			if (!o[this.name].push) {
				o[this.name] = [o[this.name]];
			}
			o[this.name].push(this.value || '');
		} else {
			o[this.name] = this.value || '';
		}
	});
	//turn array into previousSubmission format.
	var previousSubmission = {};
	previousSubmission['form_id'] = o['form_id'];
	previousSubmission['form_name'] = o['form_name'];
	previousSubmission['submitted_entry'] = o;
	previousSubmission['timestamp'] = new Date().getTime();
	console.log(previousSubmission);
	var allEntries;
	if (localStorage.previousSubmissions) {
		allEntries = JSON.parse(localStorage.previousSubmissions);
	} else {
		allEntries = [];
	}
	allEntries.unshift(previousSubmission);
	if (allEntries.length > 5) {
		allEntries.pop();
	}
	localStorage.previousSubmissions = JSON.stringify(allEntries);
}

function storeSubmittedEntry(submittedEntryString, formId) {
	var newEntry = {};
	newEntry['timestamp'] = new Date().getTime();
	newEntry['submission_string'] = submittedEntryString;
	newEntry['form_id'] = formId;
	var allSubmittedEntries;
	if (localStorage.submittedEntries) {
		allSubmittedEntries = JSON.parse(localStorage.submittedEntries);
	} else {
		allSubmittedEntries = [];
	}
	allSubmittedEntries.push(newEntry);
	localStorage.submittedEntries = JSON.stringify(allSubmittedEntries);
}

function uploadSubmittedEntries() {
	if (localStorage.submittedEntries) {
		var entries = JSON.parse(localStorage.submittedEntries);
		var entries_length = entries.length;
		var i = 0;
		$.each(entries, function(key, val) {
			var upload = $.ajax({
				type: 'POST',
				url: "http://fonstertitt.appspot.com/submit",
				data: val.submission_string,
				crossDomain: true
			});
			upload.promise().done(function(data) {
				i++;
				if (data == val.form_id) {
					var $el = $("#" + val.timestamp);
					$("<p>Uppladdningen genomf&ouml;rd!</p>").appendTo($el);
					$el.fadeOut(2300, function() {
						$(this).remove();
					}); //delete this one to save energy
					if (i == entries_length) {
						delete localStorage.submittedEntries;
					}
				} else {
					alert("uppladdningen misslyckades!");
					return false;
				}
			}).fail(function() {
				alert("uppladdningen misslyckades!");
			});
		});
	}
}
document.addEventListener("deviceready", onDeviceReady, false);

function onDeviceReady() {
	$(document).on('click', '.camera', function() {
		if (!navigator.camera) {
			alert("Camera API not supported", "Error");
			return;
		}
		var options = {
			quality: 65,
			destinationType: Camera.DestinationType.DATA_URL,
			sourceType: 1,
			// 0:Photo Library, 1=Camera, 2=Saved Album
			encodingType: 0,
			// 0=JPG 1=PNG
			correctOrientation: true,
			targetWidth: 700,
			targetHeight: 700
		};

		function addHiddenElement(elementId, imgData) {
			$("<input>", {
				type: "hidden",
				name: "imagedata" + elementId,
				id: "imagedata" + elementId,
				value: "data:image/jpeg;base64," + imgData
			}).insertAfter("#" + elementId);
			$("<a>", {
				class: "del-image-input",
				href: "#",
				id: elementId
			}).html("Ta bort bild").insertAfter("#" + elementId);
		}

		function imageData(elementId) {
			navigator.camera.getPicture(function(imgData) {
				addHiddenElement(elementId, imgData);
				//return imgData; 
			}, function() {
				alert('Fel, bildfunktionen fungerar inte');
			}, options);
		}
		imageData(this.id);
	});
	//check and display network connection on submitted entries page.
	setInterval(function() {
		if (navigator.connection.type !== Connection.NONE) {
			$("#connection").html("Du &auml;r uppkopplad till internet!");
			//$(".submitentry").removeAttr("disabled");
		} else {
			$("#connection").html("Du har ingen anslutning till internet och kan inte skicka checklistor till servern.");
			//$("#upload-submitted-entries").addClass('ui-disabled');
			//$("").target("create");
		}
	}, 5250);
	$(document).on("submit", "form", function(event) {
		var formId = $("input[name='form_id']").attr("value");
		console.log(formId);
		event.preventDefault();
		event.stopPropagation();
		var submittedEntryJson = $(this).serializeArray();
		storePreviousSubmission(submittedEntryJson);
		var submittedEntryString = $(this).serialize();
		if (navigator.connection.type == Connection.NONE) {
			alert("Du &auml;r inte uppkopplad. Checklistan kommer sparas i appen s&aring; f&aring;r du ladda upp den senare!");
			storeSubmittedEntry(submittedEntryString, formId);
			//listSubmittedEntries();
		} else {
			$.ajax({
				type: 'POST',
				url: "http://fonstertitt.appspot.com/submit",
				data: submittedEntryString,
				crossDomain: true,
				cache: false
			}).done(function(data) {
				console.log(data);
				alert("Checklistan inskickad!");
			}).fail(function(jqXHR, textStatus, errorThrown) {
				console.log("upload failed");
				console.log(jqXHR);
				console.log(textStatus);
				console.log(errorThrown);
				console.log(jqXHR.responseText);
				alert("upload failed!");
			});
		}
		document.location.href = 'index.html';
	});

	function updateChecklists() {
		if (navigator.connection.type !== Connection.NONE) {
			var requestAllForms = $.getJSON("http://fonstertitt.appspot.com/list-all-forms");
			requestAllForms.promise().done(function(data) {
				localStorage.removeItem("checklists");
				localStorage.checklists = JSON.stringify(data);
				$.each(data, function(key, val) {
					$("<li><a class='checklistObject' id='" + val.id + "'>" + val.name + "</a></li>").appendTo("#list-all-forms");
				});
				$('#list-all-forms').listview().listview('refresh');
			});
		} else {
			var data = JSON.parse(localStorage.checklists);
			$.each(data, function(key, val) {
				$("<li><a class='checklistObject' id='" + val.id + "'>" + val.name + "</a></li>").appendTo("#list-all-forms");
			});
			$('#list-all-forms').listview().listview('refresh');
		}
	}
	updateChecklists();
	$("#reload-checklists").click(function() {
		$('#list-all-forms').empty();
		updateChecklists();
	});
	$("#backwards").click(function() {
		document.location.href = 'index.html';
	});
	$("#reload-app").click(function() {
		document.location.href = 'index.html';
	});
	listSubmittedEntries();
	listPreviousSubmissions();
	$(document).on('click', '.checklistObject', function() {
		var allChecklists = JSON.parse(localStorage.checklists);
		var element_id = $(this).attr("id");
		$.each(allChecklists, function(key, val) {
			if (val.id == element_id) {
				displayChecklist(val, undefined);
			}
		});
	});
	$(document).on('click', '.previousSubmissionObject', function() {
		var previousSubmissions = JSON.parse(localStorage.previousSubmissions);
		var allChecklists = JSON.parse(localStorage.checklists);
		var element_id = this.id;
		var element_timestamp = this.name;
		$.each(allChecklists, function(key, val) {
			if (val.id == element_id) {
				$.each(previousSubmissions, function(key2, value) {
					if (value.timestamp == element_timestamp) {
						displayChecklist(val, value.submitted_entry);
					}
				});
			}
		});
	});
	$("#backwards").click(function() {
		$("form").empty();
		$("form").attr("id", "myform");
	});
	$("#upload-submitted-entries").click(function() {
		uploadSubmittedEntries();
	});
	//Remove uploaded/converted image i.e empty image src, remove hidden base64 image and its name and delete button.
	$(document).on("click", ".del-image-input", function() {
		imageId = $(this).attr("id");
		imageVar = "#outputImage" + imageId;
		//$("#image" + imageId).attr('src', 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==') //replace image with transparent gif :)
		//$("#imagename" + imageId).remove(); //delete imagename
		$("a#" + imageId + ".del-image-input").remove(); //delete "remove image" handler.
		$("#imagedata" + imageId).remove();
	});
}