#!/usr/bin/python
# -*- coding: utf-8 -*-

from logging import getLogger
log = getLogger(__name__)

import os
from ckan import logic
from ckan.plugins import implements, SingletonPlugin
from ckan.plugins import IRoutes, IConfigurer, IActions, ITemplateHelpers

from ckan.logic import NotAuthorized, check_access

import ckan.lib.dictization.model_dictize as model_dictize
import ckan.lib.dictization.model_save as model_save

import ckan.plugins as plugins
import ckan.plugins.toolkit as toolkit

from ckan.common import _
import ckan.lib.helpers as h

get_action = logic.get_action
NotFound = logic.NotFound
ValidationError = logic.ValidationError

def package_update_rest(context, data_dict):

    model = context['model']
    id = data_dict.get("id")
    request_id = context['id']
    pkg = model.Package.get(request_id)

    if not pkg:
        raise NotFound

    if id and id != pkg.id:
        pkg_from_data = model.Package.get(id)
        if pkg_from_data != pkg:
            error_dict = {id:('Cannot change value of key from %s to %s. '
                'This key is read-only') % (pkg.id, id)}
            raise ValidationError(error_dict)

    context["package"] = pkg
    context["allow_partial_update"] = True
    dictized_package = model_save.package_api_to_dict(data_dict, context)

    check_access('package_update_rest', context, dictized_package)

    dictized_after = get_action('package_update')(context, dictized_package)

    pkg = context['package']

    package_dict = model_dictize.package_to_api(pkg, context)

    return package_dict

class MultieditPlugin(SingletonPlugin):
    implements(IRoutes, inherit=True)
    implements(IConfigurer, inherit=True)
    implements(IActions, inherit=True)
    implements(ITemplateHelpers)
    
    def get_actions(self):
        return {'package_update_rest': package_update_rest}

    def after_map(self, map):
        map.connect('multiedit_index', '/multiedit',
            controller='ckanext.multiedit.controller:MultieditController',
            action='limit'
            )
        map.connect('multiedit', '/multiedit/nolimit/',
            controller='ckanext.multiedit.controller:MultieditController',
            action='nolimit'
            )
        map.connect('multiedit', '/multiedit/limit/{limit}',
            controller='ckanext.multiedit.controller:MultieditController',
            action='limit'
            )   
        map.connect('multiedit', '/multiedit/{mode:datasets|groups}/nolimit/',
            controller='ckanext.multiedit.controller:MultieditController',
            action='nolimit'
            )
        map.connect('multiedit', '/multiedit/{mode:datasets|groups}/',
            controller='ckanext.multiedit.controller:MultieditController',
            action='limit'
            )
        map.connect('multiedit', '/multiedit/{mode:datasets|groups}/limit/{limit}',
            controller='ckanext.multiedit.controller:MultieditController',
            action='limit'
            )

        map.connect('multiedit', '/multiedit/{action}',
            controller='ckanext.multiedit.controller:MultieditController'
            )

        return map

    def update_config(self, config):
        
        toolkit.add_template_directory(config, 'templates')
        toolkit.add_public_directory(config, 'public')
        
        # Here we add "scripts" and "css" Fanstatic libraries. Warning! 'css' library is apparently taken already...
        toolkit.add_resource('public/scripts/', 'multiedit_scripts')
        toolkit.add_resource('public/css/', 'multiedit_css')

    # @TODO Obsolete?
    @staticmethod
    def column_select(columns):
        
        html  = u''
        
        html += u'<select>'
        for col in columns:
            html += u'<option>'
        html += u'</select>'
        
        return toolkit.literal(html)

    @staticmethod
    def package_matrix(packages, core_fields):
        
        html  = u''
        
        html += u'<table class="table table-bordered table-condensed packages">' + u"\n"
        
        table_rows = []
        table_heads = {}
        for pkg_dict in packages:
            dic = {}
            for key, value in pkg_dict.iteritems():
                if key == 'tags':
                    tags = []
                    for tag_dict in pkg_dict['tags']:
                        tags += [tag_dict['name']]
                    dic['tags'] = tags
                    table_heads['tags'] = ""    
                elif key == 'groups':
                    groups = []
                    #for group_dict in pkg_dict['groups']:
                    #    groups += [group_dict['id']]
                    #dic['groups'] = groups
                    dic['groups'] = pkg_dict['groups']
                    table_heads['groups'] = ""
                elif key == 'extras':
                    for extra_dict in pkg_dict['extras']:
                        if not extra_dict['key'] in dic.keys():
                            dic[extra_dict['key']] = extra_dict['value']
                            table_heads[extra_dict['key']] = ""
                elif key in core_fields and key not in dic.keys():
                    dic[key] = value
                    table_heads[key] = ""
            table_rows.append(dic)
        if 'title' in table_heads:
            del table_heads['title']
        if 'id' in table_heads:
            del table_heads['id']
        table_heads_sorted = sorted(table_heads.iterkeys())
        
        html += u'<thead>' + u"\n"
        html += u'<tr>' + u"\n"
        html += u'<th class="edit narrowTh" style="width: 15px;"><input type="checkbox" name="checkall" value="checkall" class="checkall"/></th>' + u"\n"
        html += u'<th class="title wideTh" style="max-width: 250px;">Title</th>' + u"\n"
        for key in table_heads_sorted:
            html += u'<th class="' + unicode(key) + u' wideTh">' + unicode(_(key)) + u'</th>' + u"\n"
        html += u'<th class="single_edit narrowTh" style="width: 35px;">Edit</th>' + u"\n"
        html += u'</tr>' + u"\n"
        html += u'</thead>' + u"\n"
        html += u'<tbody>'
        
        for row in table_rows:
            
            html += u'<tr>' 
            
            html += u'<td><input type="checkbox" name="package_select" class="package_select" value="' + unicode(row['id']) + u'" /></td>'
            html += u'<td class="title ' + row['id'] + '">'
            html += unicode(h.link_to(row['title'] or row['name'], h.url_for(controller='package', action='read', id=row['name'])))
            html += u'</td>'
            for key in table_heads_sorted:
                
                if key in row:

                    import json

                    try:
                        row_key = json.loads(row[key])
                    except (ValueError, TypeError):
                        row_key = row[key]
                    if key == "notes":
                        val = h.markdown_extract(row_key)                    
                    if key == "groups":
                        group_ids = []
                        group_names = []
                        for group_dict in row[key]:
                            group_ids += [group_dict['id']]
                            group_names += [h.group_name_to_title(group_dict['name'])]
                        row_key = ", ".join(group_ids)
                        val = ", ".join(group_names)
                    elif isinstance(row_key, list):
                        val = ", ".join(row_key)
                    else:
                        val = row_key
                    
                    full_val = row_key
                    
                    html += u'<td class="' + unicode(key) + u' ' + unicode(row['id']) + u'" title="' + unicode(full_val) + u'" style="max-height: 100px; display: block; overflow-y: auto;">'                
                    html += unicode(val)
                    html += u'</td>'
                else:
                    html += u'<td class="' + unicode(key) + u' ' + unicode(row['id']) + u'" style="max-height: 100px; display: block; overflow-y: scroll;"></td>'
            html += u'<td class="single_edit">' + unicode(h.subnav_link(h.icon('package_edit'), controller='package', action='edit', id=row['name'])) + u'</td>'
            html += u'</tr>'
        html += u'</tbody>'
        html += u'</table>'
        
        return toolkit.literal(html)

    def get_helpers(self):
        # This method is defined in the ITemplateHelpers interface and
        # is used to return a dict of named helper functions.
        
        return {'package_matrix': MultieditPlugin.package_matrix}