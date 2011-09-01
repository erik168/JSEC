var OBJ_TPL = '<h4>{0}<dfn>类型：{1}</dfn></h4><cite>{2}</cite>';


function getObjHtml(name, obj) {
	var type         = '未知类型', 
		description  = '没有描述', 
		propHtml     = '', 
		scopeHtml    = '';

	if (obj) {
		type = obj.type;
		if (obj.description) {
			description = obj.description.info;
		}

		if (obj.properties) {
			propHtml = getListHtml(obj.properties, '对象属性摘要');
		}

		if (obj.scope) {
			scopeHtml = getListHtml(obj.scope.properties, '局部变量摘要');
		}
	}
	
	var html = formatString(OBJ_TPL, name, type, description);
	
	return html + propHtml + scopeHtml;
}

function getListHtml(obj, title) {
	if (!obj) {
		return '';
	}
	
	var count = 0;
	for (var k in obj) {
		count ++;
	}

	if (count ==0) {
		return '';
	}
	
	var html = ['<dl>'],
		listTpl = '<dd>{0}</dd>';

	if (title) {
		html.push('<dt>' + title + '</dt>');
	}

	for (var k in obj) {
		html.push(formatString(listTpl, getObjHtml(k, obj[k])));
	}
	
	html.push('</dl>');
	return html.join('');
}

function getNoticeHtml(notices) {
	if (!notices || notices.length == 0) {
		return '';
	}

	var html = ['<ul>'];
	for (var i = 0, l = notices.length; i < l; i++) {
        html.push('<li>' + notices[i] + '</li>');
    }

    html.push('</ul>');
	return html.join('');
}

document.getElementById('execBtn').onclick = function () {
	var msg = jsec.overview(G('jscode').value);
	G('Result').innerHTML =	getListHtml(msg.globel.properties);
    G('ErrorResult').innerHTML = getNoticeHtml(msg.errors);
    G('WarnResult').innerHTML = getNoticeHtml(msg.warnings);
};