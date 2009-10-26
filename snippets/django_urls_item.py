<!--
    category: Django_Urls
    name: add named url
    toolTip: add named url
    prompt(url_pattern): write url pattern
    prompt(view_name): write view name
    prompt(url_name): write url name
-->
url(r'^${url_pattern}$', '${view_name}', name = "${url_name}"),