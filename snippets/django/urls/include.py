<!--
    category: Django_Urls
    name: add include url
    toolTip: add include url
    prompt(app_name): url name
-->
(r'^${app_name}/', include('${app_name}.urls')),