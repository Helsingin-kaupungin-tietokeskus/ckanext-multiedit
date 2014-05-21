function send_ajax(url, key, val, ids, total)
{
	var data = make_data_dict(val, key, core_fields);
    $.ajaxQueue({url: url,
    	beforeSend: function(xhrObj) {
    		if(ready == 0)
    		{
    			start_spinner();
    			$("#editarea :input").attr("disabled", "disabled");
    			$('#ajax_result').html(msg_update_in_progress);
    		}
            xhrObj.setRequestHeader("X-CKAN-API-KEY", apikey);
    	},
    	data: JSON.stringify(data),
    	dataType: 'json',
    	type: "POST",
    	success: function(data, textStatus, jqXHR) {
    		
    		ready++;
    		if(errors.length == 0) {
    			
    			stop_spinner(ready, total, [textStatus + ': Update Successful']);
    		}
    		else {
    			
    			stop_spinner(ready, total, ['Update had errors: '].concat(errors));
    		}
    		
        	add_empty_column(key);
        	update_new_values_to_table(val, key, ids);
        },
        error: function(jqXHR, textStatus, errorThrown)
        {
    		ready++;
    		errors.push('Error updating dataset with id ' + ids + ': ' + errorThrown);
    		stop_spinner(ready, total, ['Update had errors: '].concat(errors));
        }
    });
}

$(document).ready(function() {

	var selected_id = $('#fieldselector :selected').val();

    hide_package_form();
    
    $('#fieldselector').change(function() {
    	
    	selected_id = $('#fieldselector :selected').val();
    	update_visible(selected_id);

    	// These get hidden unnecessarily.
        $(".select2-container").show();
        $(".select2-search").show()
    	
    }).change();        
    $('.dataset-form').append("<label for='multiadd' class='multiadd' style='float: left'>" + msg_multiadd + "</label>");
    $('.dataset-form').append("<input id='multiadd_check' type='checkbox' value='multiadd' name='multiadd' class='multiadd' style='float: left; margin-left: 10px; margin-top: -4px;' />");
    $('.dataset-form').append("<br><br>");
    $('.dataset-form').append("<input type='submit' style='float: left' value='Tallenna' /><br>")
    $('.dataset-form').submit(function(event) {
    	event.preventDefault();
		        	
    	var editField = $('#' + solve_editfield_id(selected_id));

    	var key = get_key(selected_id);
        var val = editField.val();
        /*if(selected_id == 'group') {
        	
        	var group_element = $("a.select2-choice span")[1];
        	val = $(group_element).html();
        }*/

        var ids = get_selected_packages(); 
        
        var new_val;
        var url;
        
        if(typeof ids == "undefined")
        {
        	$('#ajax_result').html(msg_no_packages_selected);
        }
        else
        {
        	var id_arr = ids.split(",");
        	
        	if ($('#multiadd_check').attr('checked'))
        	{

        		if(editField.is("textarea") || (editField.is("input") && editField.attr("type") == "text"))
        		{
            		//var id_arr = ids.split(",");

            		ready = 0;
            		errors = Array();
            		for (i = 0; i < id_arr.length; i++)
            		{
            			url = site_url + '/multiedit/multisave?ids='+id_arr[i];
            			if(key == 'title') {
            				
            				old_val = $.trim($('table.packages tr .' + key).filter('.' + id_arr[i]).children().html());
            			}
            			else if(key == 'groups') {
            				
            				old_val = $("td.groups").attr("title");
            			}
            			else {
            				
            				old_val = $.trim($('table.packages tr .' + key).filter('.' + id_arr[i]).html());
            			}
            			
            			if(key == "tags" || key == "groups") {
            				
            				if($.trim(val).substring($.trim(val).length-1, $.trim(val).length) == ',') {
            					
            					new_val = $.trim(old_val + ", " + $.trim(val).substring(0, $.trim(val).length-1));
            				}
            				else {
            					
            					new_val = $.trim(old_val + ", " + $.trim(val));
            				}
            			}
            			else {
            				
            				new_val = $.trim(old_val + " " + $.trim(val));
            			}
            			
            			send_ajax(url, key, new_val, id_arr[i], id_arr.length);
            		}
        		}
        		else
        		{
        			//$('#ajax_result').html('<strong>${_("Multiadd allowed only for textfields.")}</strong>');
        		}
        	}	
        	else
        	{
        		ready = 0;
        		errors = Array();
        		//var id_arr = ids.split(",");
        		for (i = 0; i < id_arr.length; i++)
        		{
		            url = site_url + '/multiedit/multisave?ids=' + id_arr[i];
		            new_val = val;
        			if (key == "tags")
        			{
        				if($.trim(val).substring($.trim(val).length-1, $.trim(val).length) == ',')
        					new_val = $.trim(val).substring(0, $.trim(val).length-1);        					
        			}
		            send_ajax(url, key, new_val, id_arr[i], id_arr.length);
        		}
        	}
        	
        	//setTimeout(send_ajax(url, key, new_val, id_arr[i], id_arr.length),100);
        	//send_ajax(url, key, new_val, id_arr[i], id_arr.length);
        }

		return false;
    });        
    
   	var lastCol = $('.packages tr:eq(0) th').length - 1;
   	var options = { widgets: ['zebra']}
   	var headers = {0: {sorter: false}};
   	headers[lastCol] = {sorter: false};
   	options['headers'] = headers;
   	
   	// Had to remove this because CKAN and Jinja2 are making the usage of .js-extensions too hard. @TODO Re-enable?
	/*$(".packages")
	.tablesorter(options)
	.tablesorterPager({container: $("#pager"), positionFixed: false})
	.bind("sortEnd",function() { update_visible(selected_id); });*/
	
	$(".pager_link").click(function() {
		update_visible(selected_id);
	});
	
	$(".pagesize").change(function() {
		update_visible(selected_id);
	});			
			
	$('.checkall').click(function () {
		if($(this).attr('checked'))
			$('.package_select').each(function() { $(this).attr('checked', true); });
		else
			$('.package_select').each(function() { $(this).attr('checked', false); });
	});
});