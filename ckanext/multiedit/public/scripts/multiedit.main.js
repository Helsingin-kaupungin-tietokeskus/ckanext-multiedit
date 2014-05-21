//<![CDATA[  
    
	/**
	 * This helper function will work out what is the actual id of the input
	 * field for a given field-id.
	 * 
	 * @param selected_id
	 */
	function solve_editfield_id(selected_id) {
		
        // An exception.
        if(selected_id == "url") { return "url"; }

		// Set this as fallback.
		var editfield_id = selected_id;
        
        // Basic form fields have a "field-" prefix.
        if($("#field-" + selected_id)) { editfield_id = "field-" + selected_id; }
        // But metadata fields are named in an entirely different manner.
        if($("input[value=" + selected_id + "]").val() == selected_id) { 
        	
        	// We have a hidden field containing our field_id is its value -
        	// directly below it is the field we want.
        	var hidden_id = $("input[value=" + selected_id + "]").attr('id');
        	editfield_id = hidden_id.replace('key', 'value');
        }

        return editfield_id;
	}

	function stop_spinner(ready, total, msgArr)
	{
		if (ready >= total)
    	{
			/*if (!($.browser.msie && parseFloat($.browser.version) <= 8))
				$('#editarea').spin(false);*/
			$("#editarea :input").removeAttr("disabled");
			$('#ajax_result').html('');
			for (m in msgArr)
				$('#ajax_result').html($('#ajax_result').html() + '</br><strong>' + msgArr[m] + '</strong>');			
    	}
	}
	
	function start_spinner()
	{
		/*if (!($.browser.msie && parseFloat($.browser.version) <= 8))
			$('#editarea').spin({
				  lines: 12, // The number of lines to draw
				  length: 30, // The length of each line
				  width: 15, // The line thickness
				  radius: 30, // The radius of the inner circle
				  color: '#000', // #rgb or #rrggbb
				  speed: 1, // Rounds per second
				  trail: 60, // Afterglow percentage
				  shadow: false, // Whether to render a shadow
				  hwaccel: true // Whether to use hardware acceleration
			});*/		
	}

    function update_visible(selected_id)
    {    	        
        var field_id = selected_id;
        var editfield_id = solve_editfield_id(selected_id);
        
        if($(".stages")) { $(".stages").hide() }
        
        add_empty_column(selected_id);
        
        hide_fields();

        show_selected_field(editfield_id);

        // show selected table column
        $('table.packages tr > *').hide();
        $('table.packages tr > *:first-child').show();
        $('table.packages tr .title').show();
        $('table.packages tr > *:last-child').show();
        $('table.packages tr .'+ get_key(selected_id)).show();
        
        var editField = $('#' + editfield_id);
        if(editField.is("textarea") || (editField.is("input") && editField.attr("type") == "text")) {
        	
        	$('.dataset-form').find(".multiadd").show();
        }
        else {
        	
        	$('.dataset-form').find(".multiadd").hide();
        }
        $("#multiadd_check").removeAttr("checked");
        
        $('#ajax_result').html('');
        
        //return selected_id;
    }
    
    function show_selected_field(field_id)
    {
    	$('#' + field_id).parentsUntil('.dataset-form').show(); 
    }
    
    function hide_fields()
    {
    	$('#editarea').show();
        $('.dataset-form fieldset').hide();//.children().hide();
        $('.dataset-form div').hide();//.children().hide();
        $('.dataset-form legend').hide();
    }

    function get_key(selected_id) {
    	
    	var id = selected_id;
        var split_id = selected_id.split("__");
	    
        if(split_id[0] == 'extras') {
	    	
        	id = $('#extras__' + split_id[1] + "__key").val();
        }
	    if(selected_id == 'tag_string') {
	    	
	    	id = 'tags';
	    }
	    if(selected_id == 'group') {
	    	
	    	id = 'groups';
	    }
	    if(selected_id == 'state-select') {
	    	
	    	id = 'state';
	    }
	    if(selected_id == 'license') {
	    	
	    	id = 'license_id';
	    }
	    if(selected_id == 'author-email') {
	    	
	    	id = 'author_email';
	    }
	    	
        return id;
    }
    
    function add_empty_column(selected_id)
    {
        // add columns if they don't exist  
    	var split_field = selected_id.split("__")
		if (split_field[0] == "extras" && split_field[2] == "key")
			;
		else
		{
	        var found = false;
	        $('.packages').find('th').each(function() {
	      		if ($(this).attr('class').indexOf(selected_id) != -1)
	      			found = true;     	      			
	        });
	        if (!found)
	        	$('.packages').find('thead').find('tr').find('th').filter('.title').after('<th class="' + selected_id + ' wideTh header">' + selected_id +'</th>');
	
			$('.packages').find('tbody').find('tr').each(function() {
				if ($(this).find('td').filter('.' + selected_id).length == 0)
				{
					var titleElem = $(this).find('td').filter('.title'); 
					$(titleElem).after('<td class="' + selected_id + ' ' + $(titleElem).attr('class').split(" ")[1] + '"></td>');
				}
			});
		}
    }
   
    function get_selected_packages()
    {
    	var ids;
    	$('.package_select').each(function() {
            if (this.checked) {
                if (!ids) {
                    ids = this.value;
                } else {
                    ids += "," + this.value;
                }
            }
        });
    	return ids;
    }
    
    function hide_package_form()
    {
    	hide_fields();
        
    	// Add options to fieldselector.
    	
        $('.dataset-form div > label').each(function(i, e) {
        	
        	// The form will sometimes come with groups on it, whose label does not have a "for"-attribute.
        	if($(e).attr('for')) {

	        	// Metadata and basic fields need separate handlers:
	        	if($(e).attr('for').indexOf("extras") !== -1) {
	        		// This is a metadata field. 
	        		var key_id = $(e).attr('for');
	        		var value_id = $("#" + key_id).val();

	        		var id = value_id;
	        		var name = $.trim($(e).html());
	        		
	        		if(typeof id != "undefined" && id != 'name' && id != 'log_message') {
			            
			        	$('#fieldselector').append('<option value="' + id + '">' + name + '</option>');
			        }
	        	}
	        	else {
	        		// This is a basic field, remove "field-"-prefix and add as such.
			        var id = $(e).attr('for').replace("field-", "");
			        var name = $.trim($(e).html());
			        
			        if(typeof id != "undefined" && id != 'name' && id != 'log_message') {
			            
			        	$('#fieldselector').append('<option value="' + id + '">' + name + '</option>');
			        }
	        	}
        	}
        });

	    // Fields are used to carry database field names from the controller. Clear them out.
	    $('input[name*="_value"]').val('');
	    $('textarea[name*="_value"]').val('');
    }
    
    function make_data_dict(val, key, core_fields)
    {
        var data = {};
        var use_val = val;
        if(val == null) {
        	
        	use_val = "";
        }
        
        if(key == 'group' || key == 'groups') { 
        	
        	key = 'groups';
        	data.groups = use_val.split(",");
        	$.each(data.groups, function(index, value) {
				
        		data.groups[index] = $.trim(value);
			});

        	// http://stackoverflow.com/questions/4059147/check-if-a-variable-is-a-string
        	if(typeof data.groups == 'string' || data.groups instanceof String) { data.groups = [data.groups]; }
        	
        	return data;
        }
        
        if(key == 'tags') {
        	
        	data.tags = use_val.split(",");
        	$.each(data.tags, function(index, value) {
				
        		$.trim(value);
			});
        }        
        else if($.inArray(key, core_fields) != -1) {
        	
            data[key] = use_val;
        }
        else {
        	
            data.extras = {};
            data.extras[key] = use_val;
        }
        
        return data;
    }

    function get_name(id)
    {
		return $.trim($('table.packages tr .name').filter('.' + id).html());
    }
    
    function update_new_values_to_table(val, field_id, ids) {
    	
		$('table.packages tr .' + field_id).each(function() {
			
			var new_val = val;
	    	if(field_id == 'title') {
	    		
	    		new_val = "<a href='" + $(this).children('a').attr('href') +"'>" + val + "</a>";
	    	}

			var id = $(this).attr('class').split(" ")[1];
			if ($.inArray(id, ids.split(',')) != -1) {
				
				if(typeof new_val == "object") {
					
					if(new_val) { 
						
						$(this).html(new_val.join(", "));
					}
					else { 
							
						$(this).html("");
					}
				}
				else {
					
					if(field_id == 'groups') {
						
						// For groups we update the ids to the title field...
						$(this).attr("title", new_val);
						// and the name of the group as the html. 
						var group_element = $("a.select2-choice span")[1];
						if(new_val.indexOf(",") !== -1) { new_val = this.innerHTML + ", " + $(group_element).html();}
						else { new_val = $(group_element).html(); }
					}
					
					$(this).html(new_val);
				}
			}					
		});
    }
    
 	function refresh_sorting(field_id)
 	{
		var selected_col = 0;
		var dir;
		$(".packages").trigger("update"); 
		var cols = $('.packages tr:eq(0) th');
		for (i = 0; i < cols.length; i++)
		{
			if(cols.eq(i).hasClass(field_id))
			{
				if(cols.eq(i).hasClass('headerSortDown'))
					dir = 0;
				if(cols.eq(i).hasClass('headerSortUp'))
					dir = 1;
				break;                				
			}
			else
				selected_col++;                			
		}           		
		
		var sorting = [[selected_col,dir]]; 
		$(".packages").trigger("sorton",[sorting]);
 	}
     	
 	// Global number of dataset updates that are ready. Used to stop spinner after all datasets have been updated.
 	var ready = 0;
 	// Sets maximum sent requests at a time
 	var active_max = 5;
 	var active_cur = 0;
 	var queue = Array();
 	// Global error message table
 	var errors = Array();
    
    function allChecked()
    {
		var allChecked = true;
		$('.package_select').each(function(){
			if(!$(this).attr('checked'))
			{
				allChecked = false;
			}
		});
		return allChecked;
    }
    
//]]>