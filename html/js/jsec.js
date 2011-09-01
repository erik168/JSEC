document.getElementById('execBtn').onclick = function () {
var now = new Date;
    jsec(document.getElementById('jscode').value);
    
    var tokens = jsec.getTokens();
    var html = [];
    for (var i = 0, l = tokens.length; i < l; i++) {
        var token = tokens[i];
        html.push('token字符:' + token.character + ' | token类型:' + token.type + ' | 行号:' + token.lineno);
    }
    G('LexicalResult').value = html.join('\n');
    
    G('SyntaxResult').value = jsec.getSyntaxTree();
}