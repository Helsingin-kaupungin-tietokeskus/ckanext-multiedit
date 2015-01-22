from ckan.lib.base import *
import ckan.model as model

import logging
log = logging.getLogger(__name__)
from ckan.controllers.package import PackageController, search_url, url_with_params, _encode_params
from ckan.lib.search import query_for, SearchError
from urllib import urlencode
from ckan.logic import NotFound, NotAuthorized, ValidationError, get_action, check_access, get_action

from sqlalchemy import and_
import ckan.plugins as plugins
import ckan.plugins.toolkit as toolkit
from ckan.common import OrderedDict

from ckanext.hrifi.schema import fields_translated


def search_url(params, mode):
    url = h.url_for(controller='ckanext.multiedit.controller:MultieditController', action=mode)
    return url_with_params(url, params)

class MultieditController(PackageController):
    
    
    def __before__(self, action, **params):
        super(MultieditController, self).__before__(action, **params)

    # Checks that user is logged in. We need users api key to perform updates.


    def authorize(self):    
        try:
            context = {'model': model,'user': c.user, 'auth_user_obj': c.userobj} 
            check_access('site_read',context)
        except NotAuthorized:
            abort(401, _('Not authorized to see this page'))
        return model.User.get(c.user) 


    def render_package_form(self):

        data = dict(request.params)
        
        # Populate data['extras'] for the snippet rendering inputs for them.
        extra_fields = []
        for field, translation in fields_translated.iteritems():
            extra_fields.append({u'key': field, u'value': translation})
        data['extras'] = extra_fields

        errors = {}
        error_summary = {}
        c.licenses = [('', '')] + model.Package.get_license_options()
        c.groups_authz = []

        query = model.Session.query(model.Group)
        groups = set(query.all())
        if config.get('ckan.auth.profile', '') == 'publisher':
            c.groups_available = [{'id':group.id,'name':group.name} for group in c.userobj.get_groups('organization')]#c.userobj and c.userobj.get_groups('organization') or []
            c.groups_available.extend([{'id':group.id,'name':group.name} for group in groups if not filter(lambda org: org['id'] == group.id, c.groups_available)])
        else:            
            c.groups_available = [{'id':group.id,'name':group.name} for group in groups]

        c.group_packages = {}
        for group in c.groups_available:
            pkg_ids = toolkit.get_action('dataset_list')(data_dict={'id': group['id'], 'object_type': 'dataset'})
            c.group_packages[group['name']] = pkg_ids

        extra_vars = {'data': data, 'errors': errors, 'error_summary': error_summary, 'stage': ['complete', 'complete', 'complete']}
        # Set this so we will get the metadata fields forcibly included to the form.
        extra_vars['multiedit'] = True

        return render(self._package_form(), extra_vars=extra_vars)


    def limit(self, mode='datasets', limit='0'):
        
        if limit == '0':
            c.limit = limit = config.get('multiedit.limit', '100')
        
        params_nopage = [(k, v) for k,v in request.params.items() if k != 'page']

        def drill_down_url(alternative_url=None, **by):
            params = set(params_nopage)
            params |= set(by.items())
            if alternative_url:
                return url_with_params(alternative_url, params)
            return search_url(params, mode + '/')

        c.drill_down_url = drill_down_url

        def remove_field(key, value):
            params = list(params_nopage)
            params.remove((key, value))
            return search_url(params, mode + '/')

        c.remove_field = remove_field

        return self.perform_query(mode, int(limit))


    def perform_query(self, mode, limit):
        from ckan.lib.search import SearchError

        package_type = self._guess_package_type()

        c.limit = limit

        try:
            context = {'model':model,'user': c.user or c.author}
            check_access('site_read',context)
        except NotAuthorized:
            abort(401, _('Not authorized to see this page'))

        q = c.q = request.params.get('q', u'') # unicode format (decoded from utf8)
        c.query_error = False
        try:
            page = int(request.params.get('page', 1))
        except ValueError, e:
            abort(400, ('"page" parameter must be an integer'))
        
        # most search operations should reset the page counter:
        params_nopage = [(k, v) for k,v in request.params.items() if k != 'page']

        sort_by = request.params.get('sort', None)
        params_nosort = [(k, v) for k,v in params_nopage if k != 'sort']
        def _sort_by(fields):
            """
            Sort by the given list of fields.

            Each entry in the list is a 2-tuple: (fieldname, sort_order)

            eg - [('metadata_modified', 'desc'), ('name', 'asc')]

            If fields is empty, then the default ordering is used.
            """
            params = params_nosort[:]

            if fields:
                sort_string = ', '.join( '%s %s' % f for f in fields )
                params.append(('sort', sort_string))
            return search_url(params)
        c.sort_by = _sort_by
        if sort_by is None:
            c.sort_by_fields = []
        else:
            c.sort_by_fields = [ field.split()[0] for field in sort_by.split(',') ]

        def pager_url(q=None, page=None):
            params = list(params_nopage)
            params.append(('page', page))
            return search_url(params, package_type).replace('/multiedit', '', 1)

        def no_limit_url():
            url = h.url_for(controller='ckanext.multiedit.controller:MultieditController', mode=mode, action='nolimit')
            params = [(k, v.encode('utf-8') if isinstance(v, basestring) else str(v)) \
                            for k, v in list(params_nopage)]
            if len(params) > 0:
                return url + u'?' + urlencode(params)
            else:
                return url
        
        c.no_limit_url = no_limit_url

        c.search_url_params = urlencode(_encode_params(params_nopage))

        try:
            c.query_error = False
            user = self.authorize()
            c.apikey = user.apikey
            c.core_fields = model.Package.get_fields(core_only=True)
            c.core_fields += ['tags', 'groups']
            
            c.fields = []
            search_extras = {}
            fq = ''
            for (param, value) in request.params.items():
                if param not in ['q', 'page', 'sort'] \
                        and len(value) and not param.startswith('_'):
                    if not param.startswith('ext_'):
                        c.fields.append((param, value))
                        fq += ' %s:"%s"' % (param, value)
                    else:
                        search_extras[param] = value

            fq += ' capacity:"public"'
            context = {'model': model, 'session': model.Session,
                       'user': c.user or c.author, 'for_view': True}
            
            data_dict = {
                'q':q,
                'fq':fq,
                'facet.field':g.facets,
                'rows':int(limit),
                'start':(int(page) - 1) * int(limit),
                'sort': sort_by,
                'extras':search_extras
            }

            query = get_action('package_search')(context,data_dict)
            
            if query['count'] is not None:
                c.query_count = query['count']
            else:
                c.query_count = 0
                
            #if query['count'] > int(limit):
            #    c.too_many_results = True 
                
            c.facets = query['facets']
            c.search_facets = query['search_facets']
            c.page = h.Page(
                collection=query['results'],
                page=int(page),
                url=pager_url,
                item_count=query['count'],
                items_per_page=int(limit)
            )
            c.page.items = query['results']
            c.results = c.page.items
            
            c.form = self.render_package_form()
            
        except SearchError, se:
            log.error('Dataset search error: %r', se.args)
            c.query_error = True
            c.query_count = 0
            c.facets = {}
            c.page = h.Page(collection=[])
        
        # Facets for our sidebar.
        facets = OrderedDict()

        default_facet_titles = {
                'organization': _('Organizations'),
                'groups': _('Groups'),
                'tags': _('Tags'),
                'res_format': _('Formats'),
                'license_id': _('License'),
                }

        for facet in g.facets:
            if facet in default_facet_titles:
                facets[facet] = default_facet_titles[facet]
            else:
                facets[facet] = facet

        # Facet titles
        for plugin in plugins.PluginImplementations(plugins.IFacets):
            facets = plugin.dataset_facets(facets, package_type)

        c.facet_titles = facets

        # Facet limits
        c.search_facets_limits = {}
        for facet in c.search_facets.keys():
            limit = int(request.params.get('_%s_limit' % facet,
                                           g.facets_default_number))
            c.search_facets_limits[facet] = limit
                
        if mode == 'groups':
            return render('ckanext/multiedit/matrix_groups.html')
        else:
            return render('ckanext/multiedit/matrix.html')


    # Performs query with limit of 100 000 packages
    def nolimit(self, mode='datasets'):
        
        params_nopage = [(k, v) for k,v in request.params.items() if k != 'page']
        
        def drill_down_url_nolimit(**by):
            params = list(params_nopage)
            params.extend(by.items())
            return search_url(set(params), mode + '/nolimit/')
        
        c.drill_down_url = drill_down_url_nolimit 
        
        def remove_field_nolimit(key, value):
            params = list(params_nopage)
            params.remove((key, value))
            return search_url(params, mode + '/nolimit/')

        c.remove_field = remove_field_nolimit
        
        limit = config.get('multiedit.limit', '100')

        return self.perform_query(mode, int(limit))

    # Performs api call to update packages, where ids are given as get-parameters: ?ids="id1,id2,id3"
    # Updated values are given in JSON as documented in ckan api docs
    def multisave(self):
        c.error = ''        
        pkg_id = request.params['ids']
        
        from ckan.controllers.api import ApiController

        api = ApiController()
        try:
            return api.update(register='package', ver=2, id=pkg_id)
        except NotAuthorized:
            return '{"status":"Not Authorized", "message":"' + _("Access denied.") + '"}'
        except NotFound:
            return '{"status":"Not Found", "message":"' + _("Package not found.") + '"}'
        except ValidationError:
            return '{"status":"Conflict", "message":"' + _("Validation error.") + '"}'


    def multisave_groups(self):
        c.error = ''        
        group_id = request.params['group_id']
        
        from ckan.controllers.api import ApiController

        api = ApiController()
        try:
            return api.update(register='group', ver=2, id=group_id)
        except NotAuthorized:
            return '{"status":"Not Authorized", "message":"' + _("Access denied.") + '"}'
        except NotFound:
            return '{"status":"Not Found", "message":"' + _("Group not found.") + '"}'
        except ValidationError:
            return '{"status":"Conflict", "message":"' + _("Validation error.") + '"}'


    def index(self):
        super(MultieditController, self).search()
        return render('ckanext/multiedit/matrix.html')
    
    
    
    
    
    
    
    
    
    
    
    