/***************************
 * jsec:
 * view your js
 * 
 * @author erik
 ***************************/


(function () {
    var config = {
        tab: '    '     //默认为4个空格
    };
    
    /**
     * 保留字表
     */
    var RESERVED_WORD  = {
        'break'         : 1,
        'delete'        : 1,
        'function'      : 1,
        'return'        : 1,
        'typeof'        : 1,
        'case'          : 1,
        'do'            : 1,
        'if'            : 1,
        'switch'        : 1,
        'var'           : 1,
        'catch'         : 1,
        'else'          : 1,
        'in'            : 1,
        'this'          : 1,
        'void'          : 1,
        'continue'      : 1,
        'false'         : 1,
        'instanceof'    : 1,
        'throw'         : 1,
        'while'         : 1,
        'debugger'      : 1,
        'finally'       : 1,
        'new'           : 1,
        'true'          : 1,
        'with'          : 1,
        'default'       : 1,
        'for'           : 1,
        'null'          : 1,
        'abstract'      : 1,
        'double'        : 1,
        'goto'          : 1,
        'native'        : 1,
        'static'        : 1,
        'boolean'       : 1,
        'enum'          : 1,
        'implements'    : 1,
        'package'       : 1,
        'super'         : 1,
        'byte'          : 1,
        'export'        : 1,
        'import'        : 1,
        'private'       : 1,
        'synchronized'  : 1,
        'char'          : 1,
        'extends'       : 1,
        'int'           : 1,
        'protected'     : 1,
        'throws'        : 1,
        'class'         : 1,
        'final'         : 1,
        'interface'     : 1,
        'public'        : 1,
        'transient'     : 1,
        'const'         : 1,
        'float'         : 1,
        'long'          : 1,
        'short'         : 1,
        'volatile'      : 1
    };
    
        
    /**
     * 入口
     */
    jsec = function (source) {
        tokens = lex(source);
        currentScope = globel = {};
        tokenLen = tokens.length;
        tokenIndex = -1;
        next();
        statements = stats();
    };
    
    jsec.getTokens = function () {
        return tokens;
    };
    
    jsec.getSyntaxTree = function () {
        return statements;
    };
    
    
    /**
     * 词法分析
     */
    function lex(source) {
        source = source.replace(/\r/g, '').split('\n');
        var line = -1,
            lineLen = source.length,
            code,
            tokens = [],
            prereg = true;
        
        // 词法分析用的正则表达式，修改自jslint.org
        // 匹配顺序：
        // 1. (){}[.,:;'"~?]#@
        // 2. =、 ==、===
        // 3. //{1,}、/*{1,}
        // 4. */{1,}
        // 5. ++、+=
        // 6. --、-=
        // 7. %、%=
        // 8. &、&&、&=
        // 9. |、||、|=
        //10. >、>>、>>>、>>=、>>>=
        //11. <([\/=]|\!(\[|--)?|<=?)?
        //12. ^、^=
        //13. !、!=、!==
        //14. identifier/keyword匹配：[a-zA-Z_$][a-zA-Z0-9_$]*
        //15. number匹配：[0-9]+([xX][0-9a-fA-F]+|\.[0-9]*)?([eE][+\-]?[0-9]+)?
        var tokenRegxp = /^\s*([(){}\[.,:;'"~\?\]#@]|==?=?|\/(\*|\/)?|\*[\/]?|\+[+=]?|-[\-=]?|%=?|&[&=]?|\|[|=]?|>>?>?=?|<([\/=]|\!(\[|--)?|<=?)?|\^=?|\!=?=?|[a-zA-Z_$][a-zA-Z0-9_$]*|[0-9]+([xX][0-9a-fA-F]+|\.[0-9]*)?([eE][+\-]?[0-9]+)?)/;
        
        /**
         * 匹配取出一个token串
         * 
         * @return {String} 匹配到的token串
         */
        function match() {
            var arr = tokenRegxp.exec(code);
            if (arr) {
                var tokenStr = arr[0];
                code = code.substr(tokenStr.length);
                return arr[1];
            }
        }
        
        /**
         * 读取一行
         * 
         * @return {Boolean} 是否成功读取一个有意义的行
         */
        function readLine() {
            line++;
            if (line >= lineLen) {
                return false;
            }
            
            if (line > 0) {
                tokens.push(createToken('[endline]'));
            }
            code = source[line].replace(/\t/g, config.tab);
            return true;
        }
        
        /**
         * 字符串读取
         * 
         * @param {String} begin 字符串起始符号，为单引号或双引号
         * @return {String} 字符串character
         */
        function readString(begin) {
            var str = [begin];
            var subCode;
            function walk(step) {
                subCode = code.substr(0, step);
                code = code.substr(step);
            }
            
            strloop: while (1) {
                walk(1);
                switch (subCode) {
                case '\\':
                    str.push(subCode);
                    walk(1);
                    str.push(subCode);
                    switch (subCode) {
//                    case 'b':
//                    case 'f':
//                    case 'n':
//                    case 'r':
//                    case 't':
//                    case 'v':
//                        break;
                    case 'u':
                        walk(4);
                        str.push(subCode);
                        break;
                    case 'x':
                        walk(2);
                        str.push(subCode);
                        break;
                    }
                    break;
                case begin:
                    str.push(subCode);
                    break strloop;
                default:
                    str.push(subCode);
                    break;
                }
            }
            return str.join('');
        }
        
        /**
         * 正则literal读取
         * 
         * @return {String} 正则直接量character
         */
        function readRegexp() {
            var reg = ['/'];
            var chr;
            var regType = {
                'g': 1,
                'm': 1,
                'i': 1
            };
            
            function walk() {
                chr = code.charAt(0);
                code = code.substr(1);
            }
            
            regloop: while (1) {
                walk();
                reg.push(chr);
                
                switch (chr) {
                case '\\':
                    walk();
                    break;
                case '/':
                    break regloop;
                default:
                    break;
                }
            }
            
            while (1) {
                chr = code.charAt(0);
                if (regType[chr]) {
                    reg.push(chr);
                    walk();
                } else {
                    break;
                }
            }
            
            return reg.join('');
        }
        
        /**
         * 注释读取
         * 
         * @param {String} begin 注释起始串，/*或//
         * @return {String} 注释character
         */
        function readComment(begin) {
            var str = '';
            
            if (begin == '//') {
                str = '//' + code.substr(0);
                code = '';
            } else if (begin == '/*') {
                str = '/*';
                var end = /\*\//;
                while (1) {
                    var index = code.search(end);
                    if (index >= 0) {
                        break;
                    }
                    
                    str += code + '\n';
                    readLine();
                }
                str += code.substr(0, index + 2);
                code = code.substr(index + 2);
            }
            
            return str;
        }
        
        /**
         * 词法分析，源代码读取入口
         */
        function read() {
            while (1) {
                if (code && code.length > 0) {
                    var ma = match();
                    if (!ma) {
                        code = '';
                        continue;
                    }
                    
                    var firstChar = ma.charAt(0);
                    var token;
                    var character;

                    //正常字母和_$开头的为Identifier
                    if (/[a-z$_]/i.test(firstChar)) {
                        var type = RESERVED_WORD.hasOwnProperty(ma) ? '[reserved]' : '[identifier]';
                        tokens.push(createToken(type, ma));
                        prereg = ma == 'return';
                        continue;
                    } else if (/[0-9]/.test(firstChar)) {
                        tokens.push(createToken('[number]', ma));
                        prereg = false;
                        continue;
                    }
                    
                    switch (ma) {
                    case '\'':
                    case '"':
                        token = createToken('[string]', readString(ma));
                        break;
                    case '/*':
                    case '//':
                        token = createToken('[comment]', readComment(ma));
                        break;
                    case '/':
                        if (prereg) {
                            token = createToken('[regexp]', readRegexp());
                        } else {
                            token = createToken('[punc]', ma);
                        }
                        break;
                    default:
                        token = createToken('[punc]', ma);
                        break;
                    }
                    
                    character = token.character;
                    prereg = '([{}!;?:=|&,'.indexOf(character.charAt(character.length - 1)) >= 0;
                    tokens.push(token);
                } else {
                    if (!readLine()) {
                        tokens.push(createToken('[end]'));
                        return;
                    }
                }
            }
        }
        
        /**
         * 创建一个Token对象
         * 
         * @param {String} type Token类型
         * @param {String} character Token源代码
         * @param {Object} Token对象
         */
        function createToken(type, character) {
            character = character || '';
            return {
                'type'      : type,
                'character' : character,
                'lineno'    : line + 1
            };
        }

        read();
        return tokens;
    }
    
    var globel,
        currentScope,
        previousToken,
        currentToken,
        nextToken,
        tokenIndex,
        tokenLen,
        tokens,
        currentComment,
        statements;
    
    /**
     * 获取下一个token
     * 
     * @param {String} expectation 期待的token string
     * @param {Boolean} lfSensitive 是否换行符敏感
     */
    function next(expectation, lfSensitive) {
        if (tokenIndex < tokenLen - 1) {
            consumeToken(lfSensitive);
            
            if (expectation) {
                var legal = (currentToken.character == expectation);
                
                if (!legal) {
                   // TODO: print error message
                }
            }
            return currentToken;
        }
    }
    
    /**
     * 向前读取，吃掉一个token
     */
    function consumeToken(lfSensitive) {
        tokenIndex++;
        if (tokenIndex >= tokenLen) {
            return;
        }
        
        if (previousToken && previousToken.type == '[comment]') {
            currentComment = parseComment(previousToken.character);
        }
        
        if (currentToken && currentToken.type != '[endline]') {
            previousToken = currentToken;
        }
        previousToken   = currentToken;
        currentToken    = tokens[tokenIndex];
        nextToken       = tokens[tokenIndex + 1];
        if (currentToken.type == '[comment]') {
            consumeToken();
        }
        
        if (!lfSensitive && currentToken.type == '[endline]') {
            consumeToken();
        }
    }
    
    /**
     * 解析注释
     */
    function parseComment(str) {
        var con = {};
        if (str.indexOf('\/\/') === 0) {
            con.type = 'single';
            con.info = str.substr(2).replace(/^\s+|\s+$/, '');
        } else if (str.indexOf('\/*') === 0) {
            str = str.substr(2, str.length - 4);
            con.type = str.indexOf('*') === 0 ? 'doc' : 'multi';
            str = str.split('\n');
            
            var len = str.length;
            while (len--) {
                str[len] = str[len].replace(/^\s*\*\s*/, '');
            }
            con.info = str.join('\n');
        }
        return con;
    }
    
    /**
     * 提取当前注释
     */
    function fetchComment() {
        var com = currentComment;
        currentComment = void(0);
        return com;
    }
    
    /**
     * 获取当前token的字符
     */
    function peekToken(expectation) {
        if (expectation && currentToken.character != expectation) {
           // TODO: print error message
           
        }
        return currentToken && currentToken.character;
    }
    
    /**
     * 获取当前token的所在行
     */
    function currentTokenLine() {
        return currentToken && currentToken.lineno;
    }
    
    /**
     * 语法树的节点单元
     * @class
     */
    function Node(tag, type) {
        this.tag = tag;
        this.type = type;
        this.childNodes = [];
    }
    Node.beginTag   = '<{tag}';
    Node.typeTpl    = ' type="{type}"';
    Node.linenoTpl  = ' lineno="{lineno}"';
    Node.endTag     = '</{tag}>';
    
    /**
     * 节点对象toString，返回xml形式的节点表示
     */
    Node.prototype.toString = function (indentation) {
        indentation = indentation || 0;
        
        // 计算缩进字符
        var indent = '';
        for (var i = 0; i < indentation; i++) {
            indent += '    ';
        }
        
        var str = [];
        
        // 构建注释
        if (this.comment) {
            str.push(indent + '<!-- ');
            str.push(indent + this.comment.info);
            str.push(indent +' -->\n')
        }
        
        // 构建标签起始字符串
        str.push(indent + Node.beginTag.replace(/\{tag\}/g, this.tag));
        if (this.type) {
            str.push(Node.typeTpl.replace(/\{type\}/g, this.type));
        }
        if (this.lineno) {
            str.push(Node.linenoTpl.replace(/\{lineno\}/g, this.lineno));
        }
        str.push('>');
        
        // 构建内容字符串
        var childLen = this.childNodes.length;    
        if (this.simple) {
            str.push(this.childNodes[0]);
        } else if (childLen > 0) {
            str.push('\n');
            for (var i = 0; i < childLen; i++) {
                str.push(this.childNodes[i].toString(indentation + 1) + '\n');
            }
            str.push(indent);
        }
        
        // 构建标签结尾字符串
        str.push(Node.endTag.replace(/\{tag\}/g, this.tag));
        return str.join('');
    };
    
    /**
     * 为节点添加子节点
     */
    Node.prototype.addChildNode = function () {
        for (var i = 0, l = arguments.length; i < l; i++) {
            var arg = arguments[i];
            if (typeof arg != 'undefined') {
                this.childNodes.push(arg);
            }
        }
    };
    
    /**
     * 设置节点的起始代码行
     */
    Node.prototype.setLineno = function (no) {
        this.lineno = no;
        return this;
    };
    
    /**
     * 创建表达式节点
     */
    function createExprNode(type) {
        var node = new Node('expression', type);
        for (var i = 1, l = arguments.length; i < l; i++) {
            node.addChildNode(arguments[i]);
        }
        return node;
    }
    
    /**
     * 创建单一节点
     */
    function createSimpleNode(tag, cont, type) {
        var node = new Node(tag, type);
        node.simple = 1;
        node.addChildNode(cont);
        return node;
    }
    
    /**
     * 创建function节点
     */
    function createFuncNode(isDeclare) {
        var node = new Node('function', isDeclare ? 'declaration' : 'expression');
        return node;
    }
    
    /**
     * 创建列表节点
     */
    function createListNode(tag) {
        var node = new Node(tag);
        for (var i = 1, l = arguments.length; i < l; i++) {
            node.addChildNode(arguments[i]);
        }
        return node;
    }
    
    /**
     * 创建语句节点
     */
    function createStatNode(type) {
        var node = new Node('statement', type);
        for (var i = 1, l = arguments.length; i < l; i++) {
            node.addChildNode(arguments[i]);
        }
        return node;
    }

    
    /**
     * Token表
     */
    var Token = {
        'FUNCTION': 'function',
        'SWITCH'  : 'switch',
        'TRY'     : 'try',
        'CATCH'   : 'catch',
        'FINALLY' : 'finally',
        'THROW'   : 'throw',
        'VAR'     : 'var',
        'IF'      : 'if',
        'ELSE'    : 'else',
        'DO'      : 'do',
        'WHILE'   : 'while',
        'FOR'     : 'for',
        'WITH'    : 'with',
        'DEFAULT' : 'default',
        'CASE'    : 'case',
        'IN'      : 'in',
        'BREAK'   : 'break',
        'CONTINUE': 'continue',
        'RETURN'  : 'return',
        
        'THIS'  : 'this',
        'FALSE' : 'false',
        'TRUE'  : 'true',
        'NULL'  : 'null',
        'COMMA' : ',',
        'SEMI'  : ';',
        'COLON' : ':',
        'HOOK'  : '?',
        'NEW'   : 'new',
        'DOT'   : '.',
        
        'LP'    : '(',
        'RP'    : ')',
        'LB'    : '[',
        'RB'    : ']',
        'LC'    : '{',
        'RC'    : '}',
        
        'ASSIGN'            : '=',
        'ASSIGN_ADD'        : '+=',
        'ASSIGN_SUB'        : '-=',
        'ASSIGN_MUL'        : '*=',
        'ASSIGN_DIV'        : '/=',
        'ASSIGN_MOD'        : '%=',
        'ASSIGN_BITOR'      : '|=',
        'ASSIGN_BITXOR'     : '^=',
        'ASSIGN_BITAND'     : '&=',
        'ASSIGN_LSH'        : '<<=',
        'ASSIGN_RSH'        : '>>=',
        'ASSIGN_URSH'       : '>>>=',
        
        'OR'    : '||',
        'AND'   : '&&',
        
        'BITOR'     : '|',
        'BITXOR'    : '^',
        'BITAND'    : '&',
        
        'EQ'    : '==',
        'NE'    : '!=',
        'SHEQ'  : '===',
        'SHNE'  : '!==',
        
        'INSTANCEOF'    : 'instanceof',
        'IN'            : 'in',
        'LE'            : '<=',
        'LT'            : '<',
        'GE'            : '>=',
        'GT'            : '>',
        
        'LSH'   : '<<',
        'RSH'   : '>>',
        'URSH'  : '>>>',
        
        'ADD'   : '+',
        'SUB'   : '-',
        
        'MUL'   : '*',
        'DIV'   : '/',
        'MOD'   : '%',
        
        'INC'       : '++',
        'DEC'       : '--',
        'NOT'       : '!',
        'VOID'      : 'void',
        'TYPEOF'    : 'typeof',
        'DELPROP'   : 'delete',
        'BITNOT'    : '~'
    };
    
    /**
     * assign操作运算符表
     */
    var Token_Assign = {};
    for (var tokenKey in Token) {
        if (tokenKey.indexOf('ASSIGN') == 0) {
            Token_Assign[Token[tokenKey]] = 1;
        }
    }

    /**
     * Token匹配
     * 匹配成功则向前读取一位，匹配失败则不读取
     */
    function matchToken(expection) {
        if (currentToken && currentToken.character == expection) {
            next();
            return true;
        }
        return false;
    }
    
    /**
     * 表达式解析
     * 
     * -syntax
     *  Expression : 
     *      AssignmentExpression 
     *      Expression , AssignmentExpression 
     *  ExpressionNoIn : 
     *      AssignmentExpressionNoIn 
     *      ExpressionNoIn , AssignmentExpressionNoIn 
     * 
     * -serilize
     *  <expression type="comma">
     *      <expression></expression>
     *      ...
     *  </expression>
     * 
     * @return {Node}
     */
    function expr(inFor) {
        var node = assignExpr(inFor);
        while (matchToken(Token.COMMA)) {
            node = createExprNode('comma',
                                  node, 
                                  assignExpr(inFor));
        }
        return node;
    }
    
    /**
     * Assignment表达式解析
     * 
     * -syntax
     *  AssignmentExpression : 
     *      ConditionalExpression 
     *      LeftHandSideExpression AssignmentOperator AssignmentExpression 
     *  AssignmentExpressionNoIn : 
     *      ConditionalExpressionNoIn 
     *      LeftHandSideExpression AssignmentOperator AssignmentExpressionNoIn 
     * 
     * -serilize
     *  <expression type="assignment">
     *      <expression></expression>
     *      <operator></operator>
     *      <expression></expression>
     *  </expression>
     * 
     * @return {Node}
     */
    function assignExpr(inFor) {
        var node = condExpr(inFor);
        var chr = peekToken();
        
        if (Token_Assign[chr]) {
            next();
            node = createExprNode('assignment',
                                  node, 
                                  createSimpleNode('operator', chr),
                                  assignExpr(inFor));
        }
        return node;
    }
    
    /**
     * Conditional表达式解析
     * 
     * -syntax
     *  ConditionalExpression : 
     *      LogicalORExpression 
     *      LogicalORExpression ? AssignmentExpression : AssignmentExpression 
     *  ConditionalExpressionNoIn : 
     *      LogicalORExpressionNoIn 
     *      LogicalORExpressionNoIn ? AssignmentExpression : AssignmentExpressionNoIn 
     * 
     * -serilize
     *  <expression type="conditional">
     *      <expression></expression>
     *      <expression></expression>
     *      <expression></expression>
     *  </expression>
     * 
     * @return {Node}
     */
    function condExpr(inFor) {
        var node = orExpr(inFor);
        
        if (matchToken(Token.HOOK)) {
            var trueNode = assignExpr(false);
            next(Token.COLON);
            var falseNode = assignExpr(inFor);
            node = createExprNode('conditional',
                                  node, 
                                  trueNode, 
                                  falseNode);
        }
        return node;
    }

    /**
     * LogicalOr表达式解析
     * 
     * -syntax
     *  LogicalORExpression : 
     *      LogicalANDExpression 
     *      LogicalORExpression || LogicalANDExpression 
     *  LogicalORExpressionNoIn : 
     *      LogicalANDExpressionNoIn 
     *      LogicalORExpressionNoIn || LogicalANDExpressionNoIn 
     * 
     * -serilize
     *  <expression type="logical">
     *      <expression></expression>
     *      <operator>||</operator>
     *      <expression></expression>
     *  </expression>
     * 
     * @return {Node}
     */
    function orExpr(inFor) {
        var node = andExpr(inFor);
        if (matchToken(Token.OR)) {
            node = createExprNode('logical',
                                  node, 
                                  createSimpleNode('operator', Token.OR),
                                  orExpr(inFor));
        }
        return node;
    }
    
    /**
     * LogicalAnd表达式解析
     * 
     * -syntax
     *  LogicalANDExpression : 
     *      BitwiseORExpression 
     *      LogicalANDExpression && BitwiseORExpression 
     *  LogicalANDExpressionNoIn : 
     *      BitwiseORExpressionNoIn 
     *      LogicalANDExpressionNoIn && BitwiseORExpressionNoIn 
     * 
     * -serilize
     *  <expression type="logical">
     *      <expression></expression>
     *      <operator>&&</operator>
     *      <expression></expression>
     *  </expression>
     * 
     * @return {Node}
     */
    function andExpr(inFor) {
        var node = bitOrExpr(inFor);
        if (matchToken(Token.AND)) {
            node = createExprNode('logical',
                                  node, 
                                  createSimpleNode('operator', Token.AND),
                                  andExpr(inFor));
        }
        return node;
    }
    
    /**
     * BitwiseOr表达式解析
     * 
     * -syntax
     *  BitwiseORExpression : 
     *      BitwiseXORExpression 
     *      BitwiseORExpression | BitwiseXORExpression 
     *  BitwiseORExpressionNoIn : 
     *      BitwiseXORExpressionNoIn 
     *      BitwiseORExpressionNoIn | BitwiseXORExpressionNoIn 
     * 
     * -serilize
     *  <expression type="bitwise">
     *      <expression></expression>
     *      <operator>|</operator>
     *      <expression></expression>
     *  </expression>
     * 
     * @return {Node}
     */
    function bitOrExpr(inFor) {
        var node = bitXorExpr(inFor);
        while (matchToken(Token.BITOR)) {
            node = createExprNode('bitwise',
                                  node, 
                                  createSimpleNode('operator', Token.BITOR),
                                  bitXorExpr(inFor));
        }
        return node;
    }
    
    /**
     * BitwiseXor表达式解析
     * -syntax
     *  BitwiseXORExpression : 
     *      BitwiseANDExpression 
     *      BitwiseXORExpression ^ BitwiseANDExpression 
     *  BitwiseXORExpressionNoIn : 
     *      BitwiseANDExpressionNoIn 
     *      BitwiseXORExpressionNoIn ^ BitwiseANDExpressionNoIn 
     * 
     * -serilize
     *  <expression type="bitwise">
     *      <expression></expression>
     *      <operator>^</operator>
     *      <expression></expression>
     *  </expression>
     * 
     * @return {Node}
     */
    function bitXorExpr(inFor) {
        var node = bitAndExpr(inFor);
        while (matchToken(Token.BITXOR)) {
            node = createExprNode('bitwise',
                                  node, 
                                  createSimpleNode('operator', Token.BITXOR),
                                  bitAndExpr(inFor));
        }
        return node;
    }
    
    /**
     * BitwiseAnd表达式解析
     * 
     * -syntax
     *  BitwiseANDExpression : 
     *      EqualityExpression 
     *      BitwiseANDExpression & EqualityExpression 
     *  BitwiseANDExpressionNoIn : 
     *      EqualityExpressionNoIn 
     *      BitwiseANDExpressionNoIn & EqualityExpressionNoIn 
     * 
     * -serilize
     *  <expression type="bitwise">
     *      <expression></expression>
     *      <operator>&</operator>
     *      <expression></expression>
     *  </expression>
     * 
     * @return {Node}
     */
    function bitAndExpr(inFor) {
        var node = equalityExpr(inFor);
        while (matchToken(Token.BITAND)) {
            node = createExprNode('bitwise',
                                  node, 
                                  createSimpleNode('operator', Token.BITAND),
                                  equalityExpr(inFor));
        }
        return node;
    }
    
    /**
     * Equality表达式解析
     * 
     * -syntax
     *  EqualityExpression : 
     *      RelationalExpression 
     *      EqualityExpression == RelationalExpression 
     *      EqualityExpression != RelationalExpression 
     *      EqualityExpression === RelationalExpression 
     *      EqualityExpression !== RelationalExpression 
     *  EqualityExpressionNoIn : 
     *      RelationalExpressionNoIn 
     *      EqualityExpressionNoIn == RelationalExpressionNoIn 
     *      EqualityExpressionNoIn != RelationalExpressionNoIn 
     *      EqualityExpressionNoIn === RelationalExpressionNoIn 
     *      EqualityExpressionNoIn !== RelationalExpressionNoIn 
     * 
     * -serilize
     *  <expression type="equality">
     *      <expression></expression>
     *      <operator>operator</operator>
     *      <expression></expression>
     *  </expression>
     * 
     * @return {Node}
     */
    function equalityExpr(inFor) {
        var node = relationalExpr(inFor);
        while (1) {
            var currentChar = peekToken();
            switch (currentChar) {
            case Token.EQ:
            case Token.NE:
            case Token.SHEQ:
            case Token.SHNE:
                next();
                node = createExprNode('equality',
                                      node, 
                                      createSimpleNode('operator', currentChar),
                                      relationalExpr(inFor));
                continue;
            }
            break;
        }
        return node;
    }
    
    /**
     * Relational表达式解析
     * 
     * -syntax
     *  RelationalExpression ： 
     *      ShiftExpression 
     *      RelationalExpression < ShiftExpression
     *      RelationalExpression > ShiftExpression 
     *      RelationalExpression <= ShiftExpression 
     *      RelationalExpression >= ShiftExpression 
     *      RelationalExpression instanceof ShiftExpression 
     *      RelationalExpression in ShiftExpression 
     *  RelationalExpressionNoIn : 
     *      (expression not include in)
     * 
     * -serilize
     *  <expression type="relational">
     *      <expression></expression>
     *      <operator>operator</operator>
     *      <expression></expression>
     *  </expression>
     * 
     * @return {Node}
     */
    function relationalExpr(inFor) {
        var node = shiftExpr(); 
        while (1) {
            var currentChar = peekToken();
            switch (currentChar) {
            case Token.IN:
                if (inFor) break;
                
            case Token.INSTANCEOF:
            case Token.LE:
            case Token.LT:
            case Token.GE:
            case Token.GT:
                next();
                node = createExprNode('relational',
                                      node, 
                                      createSimpleNode('operator', currentChar),
                                      shiftExpr());
                continue;
            }
            break;
        }
        return node;
    }
    
    /**
     * Shift表达式解析
     * 
     * -syntax
     *  ShiftExpression : 
     *      AdditiveExpression 
     *      ShiftExpression << AdditiveExpression
     *      ShiftExpression >> AdditiveExpression 
     *      ShiftExpression >>> AdditiveExpression 
     * 
     * -serilize
     *  <expression type="shift">
     *      <expression></expression>
     *      <operator>operator</operator>
     *      <expression></expression>
     *  </expression>
     * 
     * @return {Node}
     */
    function shiftExpr() {
        var node = addExpr();
        while (1) {
            var currentChar = peekToken();
            switch (currentChar) {
            case Token.LSH:
            case Token.URSH:
            case Token.RSH:
                next();
                node = createExprNode('shift',
                                      node, 
                                      createSimpleNode('operator', currentChar),
                                      addExpr());
                continue;
            }
            break;
        }
        return node;
    }
    
    /**
     * Additive表达式解析
     * 
     * -syntax
     *  AdditiveExpression :
     *      MultiplicativeExpression
     *      AdditiveExpression + MultiplicativeExpression 
     *      AdditiveExpression - MultiplicativeExpression
     * 
     * -serilize
     *  <expression type="additive">
     *      <expression></expression>
     *      <operator>operator</operator>
     *      <expression></expression>
     *  </expression>
     * 
     * @return {Node}
     */
    function addExpr() {
        var node = mulExpr();

        while (1) {
            var character = peekToken();
            if (character == Token.SUB || character == Token.ADD) {
                next();
                node =createExprNode('additive',
                                      node, 
                                      createSimpleNode('operator', character),
                                      mulExpr());
                continue;
            }
            break;
        }
        return node;
    }
    
    /**
     * Multiplicative表达式解析
     * 
     * -syntax
     *  MultiplicativeExpression : 
     *      UnaryExpression
     *      MultiplicativeExpression * UnaryExpression 
     *      MultiplicativeExpression / UnaryExpression 
     *      MultiplicativeExpression % UnaryExpression 
     * 
     * -serilize
     *  <expression type="multiplicative">
     *      <expression></expression>
     *      <operator>operator</operator>
     *      <expression></expression>
     *  </expression>
     * 
     * @return {Node}
     */
    function mulExpr() {
        var node = unaryExpr();
        while (1) {
            var chr = peekToken();

            switch (chr) {
            case Token.MUL:
            case Token.DIV:
            case Token.MOD:
                next();
                node = createExprNode('multiplicative',
                                      node,
                                      createSimpleNode('operator', chr), 
                                      unaryExpr());
                continue;
            }
            break;
        }
        return node;
    }
    
    /**
     * Unary表达式解析
     * 
     * -syntax
     *  UnaryExpression :
     *      PostfixExpression  
     *      delete UnaryExpression 
     *      void UnaryExpression 
     *      typeof UnaryExpression 
     *      ++ UnaryExpression 
     *      -- UnaryExpression 
     *      + UnaryExpression 
     *      - UnaryExpression
     *      ~ UnaryExpression
     *      ! UnaryExpression 
     *  PostfixExpression : 
     *      LeftHandSideExpression 
     *      LeftHandSideExpression [no LineTerminator here] ++
     *      LeftHandSideExpression [no LineTerminator here] -- 
     *  
     * -serilize
     *  <expression type="unary">
     *      <operator>operator</operator>
     *      <expression></expression>
     *  </expression>
     * 
     * @return {Node}
     */
    function unaryExpr() {
        var currentChar = peekToken();
        switch (currentChar) {
        case Token.VOID:
        case Token.NOT:
        case Token.BITNOT:
        case Token.TYPEOF:
        case Token.ADD:
        case Token.SUB:
        case Token.INC:
        case Token.DEC:
        case Token.DELPROP:
            next();
            return createExprNode('unary',
                                  createSimpleNode('operator', currentChar),
                                  unaryExpr());
        
        default:
            var node = memberExpr(true),
                chr = peekToken();
            if (chr == Token.INC || chr == Token.DEC) {
                next();
                node = createExprNode('postfix', 
                                      createSimpleNode('operator', chr),
                                      node);
            }
            return node;
        }
    }
    
    /**
     * Member表达式解析
     * 
     * -syntax
     *  MemberExpression: 
     *      PrimaryExpression 
     *      FunctionExpression 
     *      MemberExpression [ Expression ] 
     *      MemberExpression . Identifier 
     *      new MemberExpression Arguments  
     *  NewExpression: 
     *      MemberExpression 
     *      new NewExpression
     *  CallExpression: 
     *      MemberExpression Arguments 
     *      CallExpression Arguments 
     *      CallExpression [ Expression ] 
     *      CallExpression . Identifier 
     *  Arguments: 
     *      () 
     *      ( ArgumentList ) 
     *  ArgumentList: 
     *      AssignmentExpression 
     *      ArgumentList , AssignmentExpression 
     *  LeftHandSideExpression : 
     *      NewExpression 
     *      CallExpression
     * 
     * -serilize
     *  1.
     *  <expression type="property">
     *      <expression></expression>
     *      <expression></expression>
     *  </expression>
     *  2.
     *  <expression type="property">
     *      <expression></expression>
     *      <identifier>...</identifier>
     *  </expression>
     *  3.
     *  <expression type="new">
     *      <expression></expression>
     *      <arguments>
     *          <expression></expression>
     *          ...
     *      </arguments>
     *  </expression>
     *  4.
     *  <expression type="call">
     *      <expression></expression>
     *      <arguments>
     *          <expression></expression>
     *          ...
     *      </arguments>
     *  </expression>
     * 
     * @return {Node}
     */
    function memberExpr(allowCall) {
        var chr = peekToken(),
            lineno = currentTokenLine(),
            node;
        
        switch (chr) {
        case Token.NEW:
            next();
            node = createExprNode(Token.NEW, memberExpr(false));
            if (matchToken(Token.LP)) {
                argumentList(node);
            }
            break;
        
        case Token.FUNCTION:
            node = functionDefinition();
            break;
        
        default:
            node = primaryExpr();
            break;
        }
        

        readProperty: while (1) {
            chr = peekToken();
            
            switch (chr) {
            case Token.DOT:
                next();
                node = 
                    createExprNode(
                        'property-dot', 
                        node, 
                        primaryExpr());
                continue;
                
            case Token.LB:
                next();
                node = createExprNode('property', node, expr(false));
                matchToken(Token.RB);
                continue;
                
            case Token.LP:
                if (!allowCall) {
                    break readProperty;
                }
                node = createExprNode('call', node);
                next();
                argumentList(node);
                
                continue;
            }
            break;
        }
        
        return node.setLineno(lineno);
    }
    
    /**
     * Member表达式的参数解析
     */
    function argumentList(node) {
        var matched = matchToken(Token.RP),
            argsNode = createListNode('arguments');

        node.addChildNode(argsNode);
        if (!matched) {
            do {
                argsNode.addChildNode(assignExpr(false));
            } while (matchToken(Token.COMMA));
        }
        matchToken(Token.RP);
    }
    
    /**
     * Primary表达式解析
     * 
     * -syntax
     *  this 
     *  Identifier 
     *  Literal 
     *  ArrayLiteral 
     *  ObjectLiteral
     *  (Expression) 
     * 
     * -serilize
     *  1. 
     *  <array>
     *      <expression></expression>
     *      ...
     *  </array>
     *  2. 
     *  <object>
     *      <property>
     *          <literal|identifier></literal|identifier>
     *          <expression></expression>
     *      </property>
     *      ...
     *  </object>
     *  3. 
     *  <regexp>...</regexp>
     *  4. 
     *  <identifier>...</identifier>
     *  5. 
     *  <literal type="number|string">...</literal>
     *  6.
     *  <const>true|false|null|this</const>
     * 
     * @return {Node}
     */
    function primaryExpr() {
        var node,
            currentChar = peekToken();
            currentType = currentToken && currentToken.type,
            lineno = currentTokenLine();
        switch (currentChar) {
        case Token.FUNCTION:
            node = functionExpr();
            break;
        
        case Token.LP:
            next();
            node = expr(true);
            matchToken(')');
            return node;
                
        case Token.LB:
            next();
            node = createListNode('array');
            var lbMatch = matchToken(Token.RB);
            if (!lbMatch) {
                do {
                    node.childNodes.push(assignExpr());
                } while (matchToken(Token.COMMA));
            }
            matchToken(Token.RB);
            return node;
        
        case Token.LC:
            next();
            node = createListNode('object');
            var lcMatch = matchToken(Token.RC);
            if (!lcMatch) {
                objproperty: do {
                    var property = new Node('property');
                    var currentTokenType = currentToken.type;
                    node.addChildNode(property);
                    
                    // 解析注释
                    var propertyComment = fetchComment();
                    property.comment = propertyComment;
                    
                    switch (currentTokenType) {
                    case '[number]':
                    case '[string]':
                    case '[identifier]':
                        property.addChildNode(primaryExpr());
                        matchToken(Token.COLON);
                        property.childNodes.push(assignExpr(false));
                        break;
                    
                    case Token.LC:
                        break objproperty;
                    
                    default:
                        // error
                    }
                } while (matchToken(Token.COMMA));
                matchToken('}');
            }
            return node;
        
        case Token.NULL:
        case Token.THIS:
        case Token.FALSE:
        case Token.TRUE:
            node = createSimpleNode('const', currentChar, currentChar);
            break;
        
        default:
            switch (currentType) {
            case '[number]':
                node = createSimpleNode('literal', currentChar, 'number');
                break;
            
            case '[string]':
                node = createSimpleNode('literal', currentChar, 'string');
                break;
            
            case '[regexp]':
                node = createSimpleNode('regexp', currentChar);
                break;
               
            case '[identifier]':
                node = createSimpleNode('identifier', currentChar);
                break;
               
            default:
                node = void(0);
            }
            break;
        }
        next();
        return node.setLineno(lineno);
    }
    
    /**
     * 解析statements
     * 
     * serialize
     *  <statements>
     *      <<< statement
     *      <<< statement
     *      ...
     *  </statements>
     * 
     * @return {Node}
     */
    function stats() {
        var node = createListNode('statements'),
            statComment,
            stat;
        
        while (1) {
            if (peekToken() == '}'
                || (currentToken && currentToken.type == '[end]')) {
                return node;
            }
            
            statComment = fetchComment();
            stat = statement();
            stat.comment = statComment;
            node.addChildNode(stat);
        }
    }
    
    /**
     * statement解析
     * 包括函数声明
     * 
     * @return {Node}
     */
    function statement() {
        var currentChar = peekToken(),
            lineno = currentTokenLine();
        
        // labelled statement
        if (currentToken.type == '[identifier]' && nextToken.character == ':') {
            return labelledStatement().setLineno(lineno);
        } /*else if (currentToken.type == '[comment]') {
            currentComment = currentToken;
            next();
            return;
        }*/
        
        var node;
        switch (currentChar) {
        // block statement
        case Token.LC:
            node = blockStatement();
            break;
            
        // 空statement
        case Token.SEMI:
            node = emptyStatement();
            break;
            
        // 声明statement
        case Token.VAR:
            node = variableStatement();
            break;
            
        // continue statement
        case 'continue':
            node = continueStatement();
            break;
            
        // break statement
        case 'break':
            node = breakStatement();
            break;
            
        // return statement
        case 'return':
            node = returnStatement();
            break;
            
        // function声明
        case Token.FUNCTION:
            node = functionDefinition(true);
            break;
            
        case Token.IF:
            node = ifStatement();
            break;
            
        // 循环statement
        case Token.FOR:
        case Token.WHILE:
        case Token.DO:
            node = iterationStatement();
            break;
            
        // switch statement
        case Token.SWITCH:
            node = switchStatement();
            break;
        
        case Token.WITH:
            node = withStatement();
            break;
            
        // try statement
        case Token.TRY:
            node = tryStatement();
            break;
            
            // 
        case Token.RC:
            // TODO: 错误提示
            return;
            
        default:
            node = expressionStatement();
            break;
        }
        
        return node && node.setLineno(lineno);
    }

    /**
     * 解析function声明和function表达式
     * 
     * @return {Node}
     */
    function functionDefinition(isDeclare) {
        if (matchToken(Token.FUNCTION)) {
            var node = createFuncNode(isDeclare);
                hasName = (currentToken.type == '[identifier]');
                
            if (hasName) {
                node.addChildNode(primaryExpr());
            } else {
                if (isDeclare) {
                    // show error
                    return;
                }
            }
            
            var params = createListNode('params');
            node.addChildNode(params);
            matchToken(Token.LP);
            if (!matchToken(Token.RP)) {
                do {
                    if (currentToken.type == '[identifier]') {
                        params.addChildNode(primaryExpr());
                    }
                } while (matchToken(Token.COMMA));
                matchToken(Token.RP);
            }
            
            matchToken(Token.LC);
            node.addChildNode(stats());
            matchToken(Token.RC);
            return node;
        }
    }
    
    
//    Statement : 
//        Block 
//        VariableStatement 
//        EmptyStatement 
//        ExpressionStatement 
//        IfStatement 
//        IterationStatement 
//        ContinueStatement 
//        BreakStatement 
//        ReturnStatement 
//        WithStatement 
//        LabelledStatement 
//        SwitchStatement 
//        ThrowStatement 
//        TryStatement 
    
    /**
     * block语句解析
     * 
     * serialize
     *  <statement type="block">
     *      <<< statements
     *  </statement>
     * 
     * @return {Node}
     */
    function blockStatement() {
        next();
        var stat = createStatNode('block', stats());
        matchToken(Token.RC);
        
        return stat;
    }
    
    /**
     * var声明语句解析
     * 
     * serilize
     *  <statement type="variable">
     *      <declaration>
     *      </declaration>
     *  </statement>
     * 
     * @return {Node}
     */
    function variableStatement(inFor) {
        var stat = createStatNode('variable');
        
        matchToken(Token.VAR);
        while (1) {
            var declare = createListNode('declaration');
            declare.setLineno(currentTokenLine());
            declare.addChildNode(primaryExpr());
            if (matchToken(Token.ASSIGN)) {
                declare.addChildNode(assignExpr(inFor));
            }
            stat.addChildNode(declare);
            
            if (!matchToken(Token.COMMA)) {
                break;
            }
        }
        
        matchToken(';');
        return stat;
    }
    
    
    /**
     * 空语句解析
     * 
     * serialize
     * <statement type="empty"></statement>
     * 
     * @return {Node}
     */
    function emptyStatement() {
        matchToken(Token.SEMI);
        return createStatNode('empty');
    }
    
    /**
     * 表达式语句解析
     * 
     * serialize
     *  <statement type="expression">
     *      <expression></expression>
     *  </statement>
     * 
     * @return {Node}
     */
    function expressionStatement() {
        var lineno = currentTokenLine(),
            stat = createStatNode('expression', expr().setLineno(lineno));
        matchToken(Token.SEMI);
        return stat;
    }
    
    /**
     * if语句解析
     * 
     * serialize
     *  <statement type="if">
     *      <expression></expression>
     *      <statement></statement>
     *      <statement></statement>
     *  </statement>
     * 
     * @return {Node}
     */
    function ifStatement() {
        peekToken(Token.IF);
        next(Token.LP);
        var condition = expr(),
            trueStat,
            falseStat;
        matchToken(Token.RP);
        
        trueStat = statement();

        if (matchToken(Token.ELSE)) {
            falseStat = statement();
        }
        
        var stat = createStatNode('if', condition, trueStat, falseStat);
        return stat;
    }
    
    /**
     * 循环语句解析
     * 
     * serialize
     * 1. do
     *  <statement type="do">
     *      <expression></expression>
     *      <statement></statement>
     *  </statement>
     * 
     * 2. while
     *  <statement type="while">
     *      <expression></expression>
     *      <statement></statement>
     *  </statement>
     * 
     * 3. for
     *  <statement type="for">
     *      <expression></expression>
     *      <statement></statement>
     *      <statement></statement>
     *  </statement>
     * 
     * @return {Node}
     */
    function iterationStatement() {
        var currentChar = currentToken.character;
        var loopBody,
            loopCondition;
            
        switch (currentChar) {
        // 解析do循环
        case Token.DO:
            matchToken(Token.DO);
            loopBody = statement();
            next(Token.WHILE)
            next(Token.LP);
            loopCondition = expr();
            next(Token.RP);
            next(Token.SEMI);
            return createStatNode('do', loopCondition, loopBody);
            
        // 解析for循环
        case Token.FOR:
            matchToken(Token.FOR);
            next(Token.LP);
            var chr = peekToken(),
                init,
                cond,
                incr;
            if (chr == Token.SEMI) {
                init = createExprNode('empty');
            } else {
                if (chr == Token.VAR) {
                    init = variableStatement(true);
                } else {
                    init = expr(true);
                }
            }
            
            if (matchToken(Token.IN)) {
                cond = expr(false);
            } else {
                matchToken(Token.SEMI);
               
                if (peekToken() == Token.SEMI) { 
                    cond = createExprNode('empty');
                } else {
                    cond = expr(false);
                }
                
                if (peekToken() == Token.RP) {
                    incr = createExprNode('empty');
                } else {
                    next();
                    incr = expr(false);
                }
            }
            
            next(Token.RP);
            loopBody = statement();
            if (incr) {
                return createStatNode('for', init, cond, incr, loopBody);
            } else {
                return createStatNode('forin', init, cond, loopBody);
            }
            
        // 解析while循环
        case Token.WHILE:
            matchToken(Token.WHILE);
            next(Token.LP);
            loopCondition = expr();
            next(Token.RP);
            loopBody = statement();
            return createStatNode('while', loopCondition, loopBody);
            
        default:
            // TODO: 提示错误
            return void(0);
        }
    }
    
    /**
     * continue语句解析
     */
    function continueStatement() {
        next(null, true);
        var node = createListNode('continue');
        if (currentToken.type == '[identifier]') {
            node.addChildNode(primaryExpr());
        }
        matchToken(Token.SEMI);
        return node;
    }
    
    /**
     * break语句解析
     */
    function breakStatement() {
        next(null, true);
        var node = createListNode('break');
        if (currentToken.type == '[identifier]') {
            node.addChildNode(primaryExpr());
        }
        matchToken(Token.SEMI);
        return node;
    }
    
    /**
     * return语句解析
     */
    function returnStatement() {
        next(null, true);
        var node = createListNode('return'),
            chr = currentToken.character;
        if (chr != Token.SEMI && currentToken.type != '[endline]') {
            node.addChildNode(expr());
        }
        matchToken(Token.SEMI);
        return node;
    }
    
    /**
     * with语句解析
     * 
     * serialize
     *  <statement type="with">
     *      <expression></expression>
     *      <statement></statement>
     *  </statement>
     * 
     * @return {Node}
     */
    function withStatement() {
        matchToken(Token.WITH);
        next(Token.LP);
        var withObj = expr();
        next(Token.RP);
        var body = statement();
        
        return createStatNode('with', withObj, body);
    }
    
    /**
     * labelled语句解析
     * 
     * serialize
     *  <statement type="with">
     *      <identifier>identifier</identifier>
     *      <statement></statement>
     *  </statement>
     * 
     * @return {Node}
     */
    function labelledStatement() {
        var lab = primaryExpr();
        next(Token.COLON);
        var body = statement();
        matchToken(Token.SEMI);
        return createStatNode('label', lab, body);
    }
    
    /**
     * switch语句解析
     * 
     * serialize
     *  <statement type="switch">
     *      <expression></expression>
     *      <case>
     *          <expression></expression>
     *          <statements></statements>
     *      </case>
     *      <case>
     *          <expression></expression>
     *          <statements></statements>
     *      </case>
     *      <default>
     *          <statements></statements>
     *      </default>
     *  </statement>
     * 
     * @return {Node}
     */
    function switchStatement() {
        matchToken(Token.SWITCH);
        next(Token.LP);
        var condition = expr();
        var stat = createStatNode('switch', condition);
        next(Token.RP);
        caseBlock(stat);
        
        return stat;
    }
    
    /**
     * switch语句中的case block解析
     * 
     * serialize
     *  <case>
     *      <expression></expression>
     *      <statements></statements>
     *  </case>
     *  <default>
     *      <statements></statements>
     *  </default>
     * 
     * @return {Node}
     */
    function caseBlock(node) {
        var clause,
            chr,
            newCCFlag = true;;
            
        matchToken(Token.LC);
        
        while (1) {
            chr = currentToken.character;
            if (chr == Token.DEFAULT) {
                clause = createListNode('defaultclause');
                node.addChildNode(clause);
                next(Token.COLON);
                next();
            } else if (chr == Token.CASE) {
                if (!clause || clause.tag != "caseclause" || newCCFlag) {
                    clause = createListNode('caseclause');
                    node.addChildNode(clause);
                    newCCFlag = false;
                }
                matchToken(Token.CASE);
                clause.addChildNode(createListNode('case', expr()));
                next(Token.COLON);
            } else if (chr == Token.RC) {
                next();
                return;
            } else {
                if (clause) {
                    clause.addChildNode(statement());
                    newCCFlag = true;
                }
            }
        }
    }
    
    /**
     * throw语句解析
     */
    function throwStatement() {
        next(null, true);
        var node = createListNode('throw'),
            chr = currentToken.character;
        if (chr != Token.SEMI && currentToken.type != '[endline]') {
            node.addChildNode(expr());
        }
        matchToken(Token.SEMI);
        return node;
    }
    
    /**
     * try语句解析
     * 
     * serialize
     *  <statement type="try">
     *      <statement type="block"></statement>
     *      <catch>
     *          <identifier>identifier</identifier>
     *          <statement type="block"></statement>
     *      </catch>
     *      <finally>
     *          <statement type="block"></statement>
     *      </finally>
     *  </statement>
     * 
     * @return {Node}
     */
    function tryStatement() {
        var legal = false,
            catchNode,
            finalNode,
            node = createStatNode('try');
        
        matchToken(Token.TRY);
        node.addChildNode(blockStatement());
        
        if (matchToken(Token.CATCH)) {
            catchNode = createListNode('catch');
            next(Token.LP);
            catchNode.addChildNode(primaryExpr());
            next(Token.RP);
            catchNode.addChildNode(blockStatement());
            
            node.addChildNode(catchNode);
            legal = true;
        }
        
        if (matchToken(Token.FINALLY)) {
            finalNode = createListNode('finally');
            finalNode.addChildNode(blockStatement());
            node.addChildNode(finalNode);
            legal = true;
        }
        
        if (!legal) {
            // TODO: 错误提示
        }
        
        return node;
    }
})();