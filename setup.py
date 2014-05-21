from setuptools import setup, find_packages
import sys, os

version = '0.1'

setup(
	name='ckanext-multiedit',
	version=version,
	description="Allows filtered search for packages and editing of multiple packages at the same time.",
	long_description="""\
	""",
	classifiers=[], # Get strings from http://pypi.python.org/pypi?%3Aaction=list_classifiers
	keywords='',
	author='Floapps',
	author_email='jaakko.louhio@floapps.com',
	url='',
	license='',
	packages=find_packages(exclude=['ez_setup', 'examples', 'tests']),
	namespace_packages=['ckanext', 'ckanext.multiedit'],
	include_package_data=True,
	zip_safe=False,
	install_requires=[
		# -*- Extra requirements: -*-
	],
	entry_points=\
	"""
        [ckan.plugins]
	# Add plugins here, eg
	multiedit=ckanext.multiedit.plugin:MultieditPlugin
	""",
)
