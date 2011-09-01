if (jsec) {
    /**
     * 
     */
    jsec.overview = function (sourceCode) {
        /**
         * 处理行为类型列表
         */
        var ACTION = {
            NONE        : 'none',
            NEW         : 'new',
            OBJECT      : 'object',
            ARRAY       : 'array',
            PROPERTY    : 'property',
            STRING      : 'string',
            NUMBER      : 'number',
            NULL        : 'null',
            REGEXP      : 'regexp',
            BOOLEAN     : 'boolean',
            THIS        : 'this',
            OPERATOR    : 'operator',
            IDENTIFIER  : 'identifier',
            FUNCTION    : 'function',
            DECLARE     : 'declare',
            EXPRESSION  : 'expression',
            STATEMENT   : 'statement',
            ASSIGNMENT  : 'assignment',
            ACCESS_PROP : 'accessprop',
            ACCESS_PROP_DOT: 'accesspropdot',
            IDENTIFIER_STR : 'identifierstr'
        };
        
        /**
         * 获取节点的处理行为类型
         * 
         * @param {Object} node 节点
         * @return {String} 处理行为类型
         */
        function getAction(node) {
            var type = node.type;
            
            switch (node.tag) {
            case 'object':
                return ACTION.OBJECT;
               
            case 'array':
                return ACTION.ARRAY;
            
            case 'regexp':
                return ACTION.REGEXP;
                
            case 'property':
                return ACTION.PROPERTY;
                
            case 'declaration':
                return ACTION.DECLARE;
                
            case 'identifier':
                return ACTION.IDENTIFIER;
                
            case 'identifierstr':
                return ACTION.IDENTIFIER_STR;
                
            case 'literal':
                if (type == 'string') {
                    return ACTION.STRING;
                } else {
                    return ACTION.NUMBER;
                }

            case 'const':
                if (type == 'true' || type == 'false') {
                    return ACTION.BOOLEAN;;
                } else if (type == 'this') {
                    return ACTION.THIS;
                } else {
                    return ACTION.NULL;
                }
                
            case 'operator':
                return ACTION.OPERATOR;
                
            case 'function':
                return ACTION.FUNCTION;
                
            case 'expression':
                switch (type) {
                case 'property':
                    return ACTION.ACCESS_PROP;
                case 'property-dot':
                    return ACTION.ACCESS_PROP_DOT;
                case 'assignment':
                    return ACTION.ASSIGNMENT;
                case 'new':
                    return ACTION.NEW;
                default:
                    return ACTION.EXPRESSION;
                }
                break;
                
            case 'statement':
                return ACTION.STATEMENT;
            }
            
            return ACTION.NONE;
        }
        
        // 语法解析
        jsec(sourceCode);
        
        
        /**
         * object data
         */
        function NativeObject() {
            this.type = 'object';
            this.properties = {};
        };
        NativeObject.prototype = {
            /**
             * 
             */
            addProperty: function (key, value) {
                this.properties[key] = value;
            },
            
            /**
             * 
             */
            hasProperty: function (prop) {
                return this.properties.hasOwnProperty(prop);
            }
        };
        
        function clazz() {}
        clazz.prototype = NativeObject.prototype;
        
        
        
        /**
         * function object data
         */
        function FunctionObject(scope) {
            this.type = 'function';
            this.properties = {};
            this.parentScope = scope;
            this.scope = new NativeObject();
            this.scope.addProperty('arguments', {'type': 'list'});
        };
        FunctionObject.prototype = new clazz();
        FunctionObject.prototype.setVariable = function (key, value) {
            this.scope.addProperty(key, value);
        };
        FunctionObject.prototype.hasVariable = function (key) {
            return this.scope.hasProperty(key);
        };
        
        /**
         * globel object data
         */
        var GlobelObject = {
            type: 'globel',
            properties: {
                'String': createData('object'),
                'Math': createData('object'),
                'eval': createData('function')
            },
            
            setVariable: NativeObject.prototype.addProperty,
            hasVariable: NativeObject.prototype.hasProperty,
            addProperty: NativeObject.prototype.addProperty,
            hasProperty: NativeObject.prototype.hasProperty
        };
        
        /**
         * 
         */
        function Flag(type) {
            this.type = type;
        }
        Flag.get = function (type) {
            return new Flag(type);
        };
        
        Flag.is = function (flag, type) {
            return (flag 
                    && flag instanceof Flag 
                    && flag.type === type);
        };

        /**
         * 
         */
        function createData(type, value) {
            return {
                'type': type,
                'value': value
            }
        }
        
        /**
         * 
         */
        function isDeclared(identifier) {
            if (identifier.type == 'identifier') {
                identifier = identifier.value;
            }
            
            var activeObject = func;
            while (1) {
                if (activeObject.hasVariable(identifier)) {
                    return true;
                }
                if (activeObject.scope) {
                    activeObject = activeObject.parentScope;
                } else {
                    break;
                }
            }
            return false;
        }
        
        /**
         * 
         */
        function getValue(identifier) {
            var activeObject = func;
            while (activeObject) {
                if (activeObject.hasProperty(identifier)) {
                    return activeObject.properties[identifier];
                }
                activeObject = activeObject.scope;
            }
            return void(0);
        }
        
        /**
         * 
         */
        function setValue(target, value) {
            value = value || createData('undefined', void(0));
            if (value.type == 'property_accessor') {
                value = createData('expression', 'expr');
            }
            var tarValue = target.value;
            target.description && (value.description = target.description);

            switch (target.type) {
            case 'identifier':
                var activeObject = func;
                if (activeObject.hasVariable(tarValue)) {
                    activeObject.setVariable(tarValue, value);
                    return;
                }
                
                warnings.push('试图对当前执行域之外的变量赋值 "' 
                                    + tarValue 
                                    + '":行 ' 
                                    + node.lineno);
                                    
//                while (activeObject.parentScope) {
//                    if (activeObject.hasVariable(tarValue)) {
//                        activeObject.setVariable(tarValue, value);
//                        return;
//                    }
//                    activeObject = activeObject.parentScope;
//                }
//                activeObject.setVariable(tarValue, value);
                break;
                
            case 'property_accessor':
                var propStack = [];
                while (1) {
                    if (tarValue.target) {
                        if (tarValue.accessor.type != 'number'
                            && tarValue.accessor.type != 'string') {
//                            warnings.push('cannot parser property-accessor which include expression' 
//                                    + ':line ' 
//                                    + node.lineno);
                            return;
                        }
                        propStack.push(tarValue.accessor);
                        if (tarValue.target.type == 'identifier') {
                            propStack.push(tarValue.target);
                            break;
                        }
                        tarValue = tarValue.target;
                    } else {
//                        warnings.push('cannot parser property-accessor which include expression' 
//                                      + ':line ' 
//                                      + node.lineno);
                        return;
                    }
                }

                var obj, prop;
                while (1) {
                    if (propStack.length == 1) {
                        break;
                    }
                    
                    prop = propStack.pop();
                    var accessor = prop.value;
                    obj = obj ? obj.properties[accessor] : getValue(accessor);
                    if (!obj || obj.type != 'object') {
//                        warnings.push('cannot set property to ' 
//                                    + ':line ' 
//                                    + node.lineno);
                    }
                }
                
                try {
                    obj.addProperty(propStack.pop().value, value);
                } catch (e) {
                }
                
                break;
            }
        }
        
        /**
         * 
         */
        function describe(target, description) {
            if (description) {
                target.description = description;
            }
            return target;
        }
        
        var nodeStack = [jsec.getSyntaxTree()],
            nodeDepth = 0,
            actionStack = [ACTION.NONE],
            targetStack = [],
            errors = [],
            warnings = [];
            
        var propName,
            value,
            action,
            target,
            node,
            data,
            func = GlobelObject,
            arrValue,
            accessor,
            declareName,
            newObj;
        
        while (nodeDepth >= 0) {
            node = nodeStack[nodeDepth].childNodes.shift();
            if (node) {
                if (node.childNodes) {
                // 具有childNodes的节点是普通节点
                // 将节点以及节点类型对应的处理行为类型进栈
                    action = getAction(node);
                    actionStack.push(action);
                    nodeStack.push(node);
                    nodeDepth++;
                      
                    switch (action) {
                    // object literal时，将一个object进栈
                    case ACTION.OBJECT:
                        targetStack.push(new NativeObject());
                        break;
                      
                    // array literal时，将标记Array读取的对象进栈
                    // 仅用于标记，结束时用于初始化array值
                    case ACTION.ARRAY:
                        targetStack.push(Flag.get(action));
                        break;
                      
                    // object的property处理时，需要将identifier的key转换，避免提示    
                    case ACTION.PROPERTY:
                        if (node.childNodes[0].tag == 'identifier') {
                            node.childNodes[0].tag = 'identifierstr';
                        }
                        break;
                      
                    // statement时，直接将一个标记位进栈   
                    case ACTION.STATEMENT:
                        targetStack.push(Flag.get(action));
                        
                        // 将statement的注释说明添加到目标节点
                        // 1. 将赋值语句
                        // 2. 只有一个变量声明的声名语句
                        if ((node.type == 'expression' 
                                && node.childNodes[0].type == 'assignment')
                            || (node.type == 'variable'
                                && node.childNodes.length  == 1)) {
                            node.childNodes[0].childNodes[0].comment = node.comment;
                        }
                        break;
                      
                    // function时，处理构建function object，并切换域
                    case ACTION.FUNCTION:
                        targetStack.push(Flag.get(action));
                        func = new FunctionObject(func);
                        
                        // 处理函数声明以及函数表达式中的function name
                        if (node.type == 'declaration') {
                            var funcName = node.childNodes.shift().childNodes[0];
                            func.parentScope.setVariable(funcName, func);
                        } else {
                            if (node.childNodes[0].tag == 'identifier') {
                                // TODO: 类型
                                func.setVariable(
                                    node.childNodes.shift().childNodes[0], 
                                    'callee');
                            }
                        }
                          
                        // 处理形参
                        var formalParams = node.childNodes.shift().childNodes;
                        var formalParamsLen = formalParams.length;
                        while (formalParamsLen--) {
                            func.setVariable(
                               formalParams[formalParamsLen].childNodes[0]);
                        }
                        break;
                      
                    // 处理声明的identifier，避免提示，修改tag    
                    case ACTION.DECLARE:
                        node.childNodes[0].tag = 'identifierstr';
                        targetStack.push(Flag.get(action));
                        break;
                      
                    // 处理被忽略的表达式    
                    case ACTION.EXPRESSION:
                        //alert('into:'+targetStack[targetStack.length - 1].value);
                        targetStack.push(Flag.get(action));
                        break;
                          
            //                      case ACTION.ACCESS_PROP:
            //                          break;
                         
                    // a.b型属性访问处理时，需要将b节点(identifier)的key转换，避免提示    
                    case ACTION.ACCESS_PROP_DOT:
                        node.childNodes[node.childNodes.length - 1].tag = 'identifierstr';
                        break;
                        
//                    case ACTION.NEW:
//                        targetStack.push(Flag.get(action));
//                        break;
                          
                    case ACTION.NONE:
                        targetStack.push(Flag.get(action));
                        break;
                    }
                } else {
                // 不具有childNodes的节点是简单节点，如：<identifier>myid</identifier>中的myid
                // 简单节点，直接进处理目标栈，等待后续处理
                    targetStack.push(node);
                }
            } else {
            // 将不具有子节点的节点出栈，并进行处理
                action = actionStack.pop();
                node = nodeStack.pop();
                nodeDepth--;

                switch (action) {
                // 处理object literal中的property item数据
                case ACTION.PROPERTY:
                    target = targetStack.pop();
                    propName = targetStack.pop();
                    //alert(targetStack)
                    try {
                    (targetStack[targetStack.length - 1]).addProperty(propName.value, target);
                    } catch (e) {
                    	//alert(target.type)
                    }
                    break;
                
                // 处理regexp  
                case ACTION.REGEXP:
                    data = createData('regexp', targetStack.pop());
                    targetStack.push(data);
                    break;
                    
                // 处理string数据    
                case ACTION.STRING:
                    data = createData('string', targetStack.pop());
                    targetStack.push(data);
                    break;
                    
                // 处理number数据
                case ACTION.NUMBER:
                    data = createData('number', targetStack.pop());
                    targetStack.push(data);
                    break;
                    
                // 处理boolean数据
                case ACTION.BOOLEAN:
                    value = targetStack.pop() == 'true' ? true : false;
                    targetStack.push(createData('boolean', value));
                    break;
                    
                // 处理操作符
                case ACTION.OPERATOR:
                    data = createData(action, targetStack.pop());
                    targetStack.push(data);
                    break;
                
                // 处理this    
                case ACTION.THIS:
                    data = createData('this', targetStack.pop());
                    targetStack.push(data);
                    break;
                
                // 处理null值
                case ACTION.NULL:
                    data = createData('null', targetStack.pop());
                    targetStack.push(data);
                    break;
                
                // 处理数组值
                case ACTION.ARRAY:
                    arrValue = [];
                    while (1) {
                        value = targetStack.pop();
                        if (!value || Flag.is(value, action)) {
                            break;
                        }
                        arrValue.push(value);
                    }
                    targetStack.push(createData('array', arrValue));
                    break;
                
                // 处理statement，将所有statement中处理的结果出栈扔掉   
                case ACTION.STATEMENT:
                    while (1) {
                        value = targetStack.pop();
                        if (!value || Flag.is(value, action)) {
                            break;
                        }
                    }
                    break;
                
                // 处理function，恢复域   
                case ACTION.FUNCTION:
                    while (1) {
                        value = targetStack.pop();
                        if (!value || Flag.is(value, action)) {
                            break;
                        }
                    }
                    describe(func, node.comment);
                    if (node.type == 'expression') {
                        // function expression需要把function object进栈，为表达式的后续处理
                        targetStack.push(func);
                    }
                    func = func.parentScope;
                    break;
                
                // 处理expression
                case ACTION.EXPRESSION:
                    while (1) {
                    	var beforeVal = value;
                        value = targetStack.pop();
                        if (!value || Flag.is(value, action)) {
                            break;
                        }
                    }
                    targetStack.push(createData(action, 'expr'));
                    //alert(targetStack[targetStack.length - 2].value)
                    break;
                
                // 处理new表达式    
                case ACTION.NEW:
                    targetStack.pop();
                    value = targetStack.pop();
                    newObj = new NativeObject();
                    if (value.type == 'identifier') {
                        newObj.type = value.value;
                    }
                    targetStack.push(newObj);
                    break;
                
                // 处理variable declare
                case ACTION.DECLARE:
                    value = targetStack.pop();
                    declareName = targetStack.pop();
                    
                    // 变量声明可能赋值，可能不赋值
                    if (Flag.is(declareName, action)) {
                        declareName = value;
                        value = void(0);
                    } else {
                        targetStack.pop();
                    }
                    func.setVariable(declareName.value);
                    setValue(declareName, value);
                    break;
                    
                // 处理expr[expr]型property accessor
                case ACTION.ACCESS_PROP:
                    accessor = targetStack.pop();
                    target = targetStack.pop();
                    targetStack.push(
                        describe(createData(
                            'property_accessor', 
                            {
                                'target': target,
                                'accessor': accessor
                            }), node.comment));
                    break;
                    
                // 处理expr.identifier型property accessor
                case ACTION.ACCESS_PROP_DOT:
                    accessor = targetStack.pop();
                    target = targetStack.pop();
                    accessor.type = 'string';
                    targetStack.push(
                        describe(createData(
                            'property_accessor', 
                            {
                                'target': target,
                                'accessor': accessor
                            }), node.comment));
                    break;
                
                // 处理identifier
                // 提示未声明变量的使用    
                case ACTION.IDENTIFIER:
                    value = targetStack.pop();
                    if(!isDeclared(value)) {
                        errors.push('试图使用未声明的变量 "' 
                                    + value 
                                    + '":行 ' 
                                    + node.lineno);
                    }
                    targetStack.push(describe(createData(action, value), node.comment));
                    break;
                
                // 处理未需提示的identifier
                case ACTION.IDENTIFIER_STR:
                    value = targetStack.pop();
                    targetStack.push(describe(createData(ACTION.IDENTIFIER, value), node.comment));
                    break;
                
                // 处理操作符为=的赋值表达式
                case ACTION.ASSIGNMENT:
                    value = targetStack.pop();
                    var oper = targetStack.pop();
                    target = targetStack.pop();
                    if (oper.value == '=') {
                        setValue(target, value);
                    }
                    targetStack.push(createData(ACTION.EXPRESSION, 'expr'));
                    break;
                
                // 默认处理
                case ACTION.NONE:
                    while (1) {
                        value = targetStack.pop();
                        if (!value || Flag.is(value, action)) {
                            break;
                        }
                    }
                    targetStack.push(createData(action, 'unknown'));
                    break;
                }
            }
        }
        
        return {
            'globel': GlobelObject,
            'errors': errors,
            'warnings': warnings
        };
    };
}
