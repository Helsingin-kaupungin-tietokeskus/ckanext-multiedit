function send_groups_ajax(group_id, group_name, data, selected_packages, total, mode) //group_packages
{

	//var data = {'packages': group_packages};
	
    $.ajaxQueue({url: site_url + '/multiedit/multisave_groups?group_id='+group_id,
    	beforeSend: function(xhrObj){
            xhrObj.setRequestHeader("X-CKAN-API-KEY",apikey);
    	},
    	data: JSON.stringify(data),
    	dataType: 'json',
    	type: "POST",
    	success: function(data, textStatus, jqXHR)
        {
    		ready++;
    		if (errors.length == 0)
    			stop_spinner(ready, total, [textStatus + ': Update Successful']);
    		else
    			stop_spinner(ready, total, ['Update had errors: '].concat(errors));            		
        	update_new_groups_to_table(group_name, selected_packages, mode);           		
        	            	
        },
        error: function(jqXHR, textStatus, errorThrown)
        {
    		ready++;
    		errors.push('Error updating group with id ' + group_id + ': ' + errorThrown);
    		stop_spinner(ready, total, ['Update had errors: '].concat(errors));        	
        }
    });
}

function update_new_groups_to_table(val, packages, mode)
{
	$('table.packages tr .groups').each(
			function(){
				var row_id = $(this).attr('class').split(" ")[1];
				if ($.inArray(row_id, packages) != -1)
				{
					var old_val = $.trim($('table.packages tr .groups').filter('.' + row_id).html());
					var new_val = "";
					if (mode == "add")
					{
						if (old_val == "")
							new_val = val;
						else if ($.inArray(val, old_val.split(', ')) == -1)
	        				new_val = old_val + ", " + val;
					}
					else if (mode=="remove")
					{
						if ($.inArray(val, old_val.split(', ')) == -1)
						{
							//alert('group_name not found, val:' + val + " ,old_val:" + old_val);
							new_val = old_val;
						}
						else
						{
							//alert('group_name found: ' + val);
							var new_arr_val = jQuery.grep(old_val.split(', '), function(value) {
									return value != val;
								});
							new_val = new_arr_val.join(', ');
						}
	        				
					}
					//alert('updating new value: ' + new_val);
					$(this).html(new_val);
				}					
			}
	);
}

$(document).ready(function() {

	$('#editarea').show();
	var selected_id = "groups";
    
    $('#group-edit').submit(function(event) {
    	event.preventDefault();

        var key = selected_id;
        var selected_pkgs = get_selected_packages().split(',');             
                   
        var selected_groups = $('#groups').val();
        if(typeof id_arr == null)
        {
        	$('#ajax_result').html(msg_no_packages_selected);
        }
        else
        {
        	start_spinner();
			$("#editarea :input").attr("disabled", "disabled");
			$('#ajax_result').html(msg_update_in_progress);
        	
			ready = 0;
    		errors = Array();
    		for (group in selected_groups)
    		{
    		    $.ajax({url: site_url + '/api/2/rest/group/' + selected_groups[group],
    		    	beforeSend: function(xhrObj){
    		            xhrObj.setRequestHeader("X-CKAN-API-KEY",apikey);
    		    	},
    		    	dataType: 'json',
    		    	type: "GET",
    		    	success: function(data)
    		        {
    		    		var pkgs = data['packages']; 
    		    		var mode = $('.mode:checked').val();
    		    		if (mode == "add")	
    		    		{
	            			for (pkg in selected_pkgs)
	                		{
	                			if ($.inArray(selected_pkgs[pkg], pkgs) == -1)
	                				pkgs.push(selected_pkgs[pkg])
	                		}
    		    			data['packages'] = pkgs;
    		        	}
    		    		else if(mode == "remove")
    		    		{
        		    		var new_pkgs = [];
                			for (pkg in pkgs)
                    		{
                    			if ($.inArray(pkgs[pkg], selected_pkgs) == -1)
                    				new_pkgs.push(pkgs[pkg])
                    		}
                			data['packages'] = new_pkgs;
    		    		}
            			
            			send_groups_ajax(selected_groups[group], data['title'], data, selected_pkgs, selected_groups.length, mode);
    		        }
    		    });
    		}

        }
		return false;
    });        
    
   	var lastCol = $('.packages tr:eq(0) th').length - 1;
   	var options = { widgets: ['zebra']}
   	var headers = {0: {sorter: false}};
   	headers[lastCol] = {sorter: false};
   	options['headers'] = headers;
   	
	$(".packages")
	.tablesorter(options)
	.tablesorterPager({container: $("#pager"), positionFixed: false})
	.bind("sortEnd",function() { update_visible(selected_id); });
	
	$(".pager_link").click(function(){
		update_visible(selected_id);
	});
	
	$(".pagesize").change(function(){
		update_visible(selected_id);
	});			
			
	$('.checkall').click(function () {
		if($(this).attr('checked'))
			$('.package_select').each(function(){$(this).attr('checked', true);});
		else
			$('.package_select').each(function(){$(this).attr('checked', false);});
	});

});