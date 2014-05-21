ckanext-multiedits
+++++++++++++++++++++++++++++++++

Provides CKAN with a table style display of datasets. Allows easy editing of multiple datasets simultaneously according to used form model.
For CKAN 1.6.x compatible version adding/removing multiple datasets to/from a group is now possible.

This is a CKAN extension - http://ckan.org/wiki/Extensions.

mercurial repository - http://bitbucket.org/floapps/ckanext-multiedits

Install
=======
In an activated python environment run:
pip install -e hg+https://bitbucket.org/floapps/ckanext-multiedit#egg=ckanext-multiedit

[Master revision is compatible only with CKAN 1.6.x versions]

[Add @ckan-1.5.x if you want to install ckan-1.5.x compatible version]

[Add @ckan-1.4.x if you want to install ckan-1.4.x compatible version]


Enabling
========

Enable by adding to your ckan.plugins line in CKAN config::

  ckan.plugins = multiedit
  multiedit.package_type = your.package.type
  multiedit.limit = X  

where X is your prefered limit for datasets shown. Note that showing and editing hundreds of datasets simultaneously
can be taxing to your server, so choose a sensible limit. 
your.package.type is package type your form extension returns with package_types() -function
(see http://docs.ckan.org/en/latest/writing-extensions.html#module-ckan.plugins.core for more details).
This is used for connecting your customized form to multiedit.

Usage
=====
Point your browser to: your.ckan.address/multiedit/packages/ or your.ckan.address/multiedit/groups/
Note that you need to be logged in to use multiedit, since it needs your apikey to make updates.
Search works just like regular CKAN search.
