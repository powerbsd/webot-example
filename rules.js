var crypto = require('crypto');

var debug = require('debug');
var log = debug('webot-example:log');
var verbose = debug('webot-example:verbose');
var error = debug('webot-example:error');

var _ = require('underscore')._;
var search = require('./support').search;
var geo2loc = require('./support').geo2loc;

/**
 * 初始化路由规则
 */
module.exports = exports = function(webot){
  var reg_help = /^(help|\?)$/i
  webot.set({
    // name 和 description 都不是必须的
    name: 'hello help',
    description: '获取使用帮助，发送 help',
    pattern: function(info) {
      //首次关注时,会收到subscribe event
      return info.event === 'subscribe' || reg_help.test(info.text);
    },
    handler: function(info){
      var reply = {
        title: '感谢您收听羊圈[Yjion.com]微信公众平台;',
        pic: 'http://www.yjion.com/qrcode.jpg',
        url: 'ttp://www.yjion.com/',
        description: [
          '我们将给您发送最新的羊圈[Yjion.com]资讯和动态\n',
          '建议你试试这几条指令:\n',
            '1. game : 玩玩猜数字的游戏吧\n',
            '2. s+空格+关键词 : 我会帮你百度搜索喔\n',
            '3. s+空格+nde : 可以试试我的纠错能力\n',
            '4. 发送你的经纬度\n',
            '5. 重看本指令请回复help或问号\n',
            '6. 更多指令请回复more\n',
            '点击下面的「查看全文」将跳转到我的羊圈[Yjion.com]主页'
        ].join('\n')
      };
      // 返回值如果是list，则回复图文消息列表
      return reply;
    }
  });

  // 更简单地设置一条规则
  webot.set(/^more$/i, function(info){
    var reply = _.chain(webot.get()).filter(function(rule){
      return rule.description;
    }).map(function(rule){
      //console.log(rule.name)
      return '> ' + rule.description;
    }).join('\n').value();
    
    return '我的主人还没教我太多东西,你可以考虑帮我加下.\n可用的指令:\n'+ reply;
  });

  webot.set('who_are_you', {
    description: '想知道我是谁吗? 发送: who?',
    // pattern 既可以是函数，也可以是 regexp 或 字符串(模糊匹配)
    pattern: /who|你是[谁\?]+/i,
    // 回复handler也可以直接是字符串或数组，如果是数组则随机返回一个子元素
    handler: ['我是神马机器人', '微信机器人']
  });

  // 正则匹配后的匹配组存在 info.query 中
  webot.set('your_name', {
    description: '自我介绍下吧, 发送: I am [enter_your_name]',
    pattern: /^(?:my name is|i am|我(?:的名字)?(?:是|叫)?)\s*(.*)$/i,

    // handler: function(info, action){
    //   return '你好,' + info.query[1]
    // }
    // 或者更简单一点
    handler: '你好,{1}'
  });

  // 简单的纯文本对话，可以用单独的 yaml 文件来定义
  require('js-yaml');
  webot.dialog(__dirname + '/dialog.yaml');

  // 支持一次性加多个（方便后台数据库存储规则）
  webot.set([{
    name: 'morning',
    description: '打个招呼吧, 发送: good morning',
    pattern: /^(早上?好?|(good )?moring)[啊\!！\.。]*$/i,
    handler: function(info){
      var d = new Date();
      var h = d.getHours();
      if (h < 3) return '[嘘] 我这边还是深夜呢，别吵着大家了';
      if (h < 5) return '这才几点钟啊，您就醒了？';
      if (h < 7) return '早啊官人！您可起得真早呐~ 给你请安了！\n 今天想参加点什么活动呢？';
      if (h < 9) return 'Morning, sir! 新的一天又开始了！您今天心情怎么样？';
      if (h < 12) return '这都几点了，还早啊...';
      if (h < 14) return '人家中午饭都吃过了，还早呐？';
      if (h < 17) return '如此美好的下午，是很适合出门逛逛的';
      if (h < 21) return '早，什么早？找碴的找？';
      if (h >= 21) return '您还是早点睡吧...';
    }
  }, {
    name: 'time',
    description: '想知道几点吗? 发送: time',
    pattern: /^(几点了|time)\??$/i,
    handler: function(info) {
      var d = new Date();
      var h = d.getHours();
      var t = '现在是服务器时间' + h + '点' + d.getMinutes() + '分';
      if (h < 4 || h > 22) return t + '，夜深了，早点睡吧 [月亮]';
      if (h < 6) return t + '，您还是再多睡会儿吧';
      if (h < 9) return t + '，又是一个美好的清晨呢，今天准备去哪里玩呢？';
      if (h < 12) return t + '，一日之计在于晨，今天要做的事情安排好了吗？';
      if (h < 15) return t + '，午后的冬日是否特别动人？';
      if (h < 19) return t + '，又是一个充满活力的下午！今天你的任务完成了吗？';
      if (h <= 22) return t + '，这样一个美好的夜晚，有没有去看什么演出？';
      return t;
    }
  }]);

  // 等待下一次回复
  webot.set('guess my sex', {
    pattern: /是男.还是女.|你.*男的女的/,
    handler: '你猜猜看呐',
    replies: {
      '/女|girl/i': '人家才不是女人呢',
      '/男|boy/i': '是的，我就是翩翩公子一枚',
      'both|不男不女': '你丫才不男不女呢',
      '不猜': '好的，再见',
      // 请谨慎使用通配符
      '/.*/': function(info) {
        if (info.rewaitCount < 2) {
          webot.rewait(info.user);
          return '你到底还猜不猜嘛！';
        }
        return '看来你真的不想猜啊';
      },
    }
    
    // 也可以用一个函数搞定:
    // replies: function(info){
    //   return 'haha, I wont tell you'
    // }

    // 也可以是数组格式，每个元素为一条rule
    // replies: [{
    //   pattern: '/^g(irl)?\\??$/i',
    //   handler: '猜错'
    // },{
    //   pattern: '/^b(oy)?\\??$/i',
    //   handler: '猜对了'
    // },{
    //   pattern: 'both',
    //   handler: '对你无语...'
    // }]
  });

  // 也可以这样wait,并且rewait
  webot.set('guess number', {
    description: '发送: game , 玩玩猜数字的游戏吧',
    pattern: /(?:game|玩?游戏)\s*(\d*)/,
    handler: function(info){
      //等待下一次回复
      var retryCount = 3;
      var num = Number(info.query[1]) || _.random(1,9);

      verbose('answer is: ' + num);

      webot.wait(info.user, function(replied_info){
        var r= Number(replied_info.text);

        // 用户不想玩了...
        if (isNaN(r)) {
          webot.data(info.user. null);
          return null;
        }

        if (r === num){
          return '你真聪明!';
        }

        retryCount--;
        if (retryCount <= 0) {
          return '怎么这样都猜不出来！答案是 ' + num + ' 啊！';
        }

        //重试
        webot.rewait(info.user);
        return (r > num ? '大了': '小了') +',还有' + retryCount + '次机会,再猜.';
      });
      return '玩玩猜数字的游戏吧, 1~9,选一个';
    }
  });

  // 调用已有的action
  webot.set('suggest keyword', {
    description: '发送: s nde ,然后再回复Y或其他',
    pattern: /^(?:搜索?|search|s\b)\s*(.+)/i,
    handler: function(info){
      var q = info.query[1];
      if (q === 'nde') {
        info.wait({
          name: 'try_waiter_suggest',
          handler: function(replied_info, next){
            if (!replied_info.text) {
              return next();
            }

            // 按照定义规则的 name 获取其他 handler
            var rule_search = webot.get('search');

            // 用户回复回来的消息
            if (replied_info.text.match(/^(好|要|y)$/i)) {

              // 修改回复消息的匹配文本，传入搜索命令执行
              info.query = ['s nodejs', 'nodejs'];

              // 执行某条规则
              rule_search.exec(info, next);
            } else {
              // 或者直接调用 handler :
              rule_search.handler(info, next);

              // 甚至直接用命名好的 function name 来调用：
              // do_search(info, next);
            }
          }
        });
        return '你输入了:' + q + '，似乎拼写错误。要我帮你更改为「nodejs」并搜索吗?';
      }
    }
  });

  function do_search(info, next){
    // pattern的解析结果将放在query里
    var q = info.query[1];
    log('searching: ', q);
    // 从某个地方搜索到数据...
    return search(q , next);
  }

  // 可以通过回调返回结果
  webot.set('search', {
    description: '发送: s 关键词 ',
    pattern: /^(?:搜索?|search|百度|s\b)\s*(.+)/i,
    //handler也可以是异步的
    handler: do_search
  });


  // 超时处理
  webot.set('timeout', {
    description: '输入timeout,等待5秒后回复,会提示超时',
    pattern: 'timeout',
    handler: function(info){
      var now = new Date().getTime();
      webot.wait(info.user, function(replied_info){
        if(new Date().getTime() - now > 5000){
          return '你的操作超时了,请重新输入';
        }else{
          return '你在规定时限里面输入了: ' + replied_info.text;
        }
      });
      return '请等待5秒后回复';
    }
  });

  // 对于特殊消息的处理，提供缩写API
  webot.location(function(info, next){
    geo2loc(info, function(err, location, data){
      next(null, location ? '你正在' + location : '我不知道你在什么地方。');
    });
  }, '从地理位置获取城市信息')
  .image(function(info, next){
      verbose('image url: %s', info.pic);
      try{
        var shasum = crypto.createHash('md5');

        var req = require('request')(info.pic);

        req.on('data', function(data) {
          shasum.update(data);
        });
        req.on('end', function() {
          return next(null, '你的图片hash: ' + shasum.digest('hex'));
        });
      }catch(e){
        error('Failed hashing image: %s', e)
        return '生成图片hash失败: ' + e;
      }
  }, '发送图片，获取其HASH值');

  // 回复图文消息
  webot.set('reply_news', {
    description: '发送news,我将回复图文消息你',
    pattern: /^news\s*(\d*)$/,
    handler: function(info){
      var reply = [{
        title: '羊圈[Yjion.com]',
        description: '羊圈机器人测试帐号：yjion_',
        pic: 'http://www.yjion.com/qrcode.jpg',
        url: 'http://www.yjion.com'
      }, {
        title: '我家主人的微信账号，扫描二维码',
        description: '丁伟国微信帐号二维码：vachel-event',
        pic: 'http://www.yjion.com/vachel.jpg',
        url: 'http://www.yjion.com/vachel.jpg'
      }, {
        title: '我家主人的新浪微博，请@丁伟国',
        description: '新浪微博@丁伟国',
        pic: 'http://www.yjion.com/223480.jpg',
        url: 'http://weibo.com/223480/'
      }];
      // 发送 "news 1" 时只回复一条图文消息
      return Number(info.param[1]) == 1 ? reply[0] : reply;
    }
  });

  // 可以指定图文消息的映射关系
  webot.config.mapping = function(item, index, info){
    //item.title = (index+1) + '> ' + item.title;
    return item;
  };

  //所有消息都无法匹配时的fallback
  webot.set(/.*/, function(info){
    // 利用 error log 收集听不懂的消息，以利于接下来完善规则
    // 你也可以将这些 message 存入数据库
    error('unknown message: %s', info.text);
    info.flag = 1;
    return '你发送了「' + info.text + '」,可惜我太笨了,听不懂. 发送: help 查看可用的指令';
  });
};
