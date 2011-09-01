function G(id) {
    return document.getElementById(id);
}

function formatString() {
    var argus = [];
    argus = Array.apply(argus, arguments);
	var mother = argus[0];
	argus.splice(0, 1);
    var reStr = mother.replace(/\{([0-9]+)\}/g, function ($0, num) {
        var str = argus[parseInt(num, 10)];
        return (typeof str == 'undefined' ? '' : str);
    });
    return reStr;
}