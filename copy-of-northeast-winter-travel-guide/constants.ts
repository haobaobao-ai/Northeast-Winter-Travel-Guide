import { TravelSection } from './types';

export const INITIAL_DATA: Record<string, TravelSection> = {
  prep: {
    id: 'prep',
    title: '行前准备',
    description: '票务信息与核心装备',
    items: [
      {
        id: 'p1',
        title: '去程火车：G107 (已出票)',
        subtitle: '北京西站 - 哈尔滨西站',
        time: '2月7日出发',
        content: '08:56 北京西站开 \n14:19 抵达哈尔滨西站\n\n提示：车程约5.5小时，建议准备颈枕和一些零食。',
        tags: ['已完成', '交通'],
        type: 'alert',
        imageUrl: 'https://images.unsplash.com/photo-1474487548417-781cb714c2f3?q=80&w=800&auto=format&fit=crop'
      }
    ]
  },
  harbin: {
    id: 'harbin',
    title: '哈尔滨：冰雪与建筑',
    description: '2月7日 - 2月10日 · 住在老道外',
    items: [
      {
        id: 'h-hotel',
        title: '住宿信息',
        subtitle: '亚美酒店（中华巴洛克店）',
        content: '位置优势：位于“老道外”，出门就是中华巴洛克风情街。这里是哈尔滨的发源地，美食极多，且比中央大街更具烟火气。',
        tags: ['住宿', '老道外'],
        type: 'hotel',
        imageUrl: 'https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?q=80&w=800&auto=format&fit=crop'
      },
      {
        id: 'h-d1',
        title: 'Day 1: 落地老道外',
        time: '2月7日 (周六)',
        content: '14:19 抵达哈西，打车/地铁前往酒店办理入住。\n16:00 就在楼下逛【中华巴洛克风情街】，看百年老建筑的夜景。\n17:30 晚餐就在附近吃：张包铺（排骨包）、富强大骨棒或老鼎丰糕点。\n晚上：早点休息，适应气温。',
        type: 'itinerary',
        imageUrl: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?q=80&w=800&auto=format&fit=crop'
      },
      {
        id: 'h-d2',
        title: 'Day 2: 经典地标 & 搓澡',
        time: '2月8日 (周日)',
        content: '09:30 打车前往【索菲亚大教堂】拍照。\n11:00 步行至【中央大街】，一路走到江边，看防洪纪念塔。\n14:00 【松花江冰上嘉年华】，体验冰车、雪圈。\n17:00 体验东北洗浴文化（推荐：青瓦台、澜悦或大江户），洗去寒气，吃自助餐。',
        type: 'itinerary',
        imageUrl: 'https://images.unsplash.com/photo-1612450630325-a6e5b2259648?q=80&w=800&auto=format&fit=crop'
      },
      {
        id: 'h-d3',
        title: 'Day 3: 冰雪大世界',
        time: '2月9日 (周一)',
        content: '上午：睡个懒觉，或者去红专街早市（如果起得来）。\n12:30 前往【冰雪大世界】。白天看雪雕，下午排大滑梯/摩天轮。\n16:00 园区开灯，拍摄绝美蓝调时刻（务必贴好暖宝宝）。\n18:30 晚餐：铁锅炖大鹅或铜锅涮肉，暖暖身子。',
        tags: ['重点行程', '保暖'],
        type: 'activity',
        imageUrl: 'https://images.unsplash.com/photo-1639922240974-9f7062482346?q=80&w=800&auto=format&fit=crop'
      },
       {
        id: 'h-d4',
        title: 'Day 4: 转战鹤城',
        time: '2月10日 (周二)',
        content: '早起退房，乘坐高铁前往齐齐哈尔（车程约1.5小时）。\n推荐车次：上午10点左右的D/G字头列车。',
        type: 'itinerary',
        imageUrl: 'https://images.unsplash.com/photo-1587595431973-160d0d94add1?q=80&w=800&auto=format&fit=crop'
      }
    ]
  },
  qiqihar: {
    id: 'qiqihar',
    title: '齐齐哈尔：烤肉之都',
    description: '2月10日 - 2月15日 · 纯粹的美食与雪原',
    items: [
      {
        id: 'q-stay',
        title: '住宿建议',
        content: '推荐住在【万达广场】或【中环广场】附近。购物方便，且周围烤肉店云集，交通便利。',
        tags: ['市中心', '便利'],
        type: 'hotel',
        imageUrl: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=800&auto=format&fit=crop'
      },
      {
        id: 'q-food',
        title: '必做：疯狂吃烤肉',
        content: '齐齐哈尔烤肉是必吃项！肉是按“斤”拌的。\n1. 传统老店：马家、顺玉、林家。\n2. 特色店：完美生活（环境好）、敬子烤肉。\n3. 搭配：必须喝“雪菲力”饮料，解腻一绝。',
        tags: ['美食', '核心'],
        type: 'food',
        imageUrl: 'https://images.unsplash.com/photo-1594041680508-e39846e34721?q=80&w=800&auto=format&fit=crop'
      },
      {
        id: 'q-crane',
        title: '必做：扎龙观鹤',
        content: '前往扎龙自然保护区看丹顶鹤雪地放飞。\n提示：旷野风极大，体感温度比市区低10度，务必穿上最厚的装备（两层羽绒服也不为过）。',
        tags: ['景点', '视觉震撼'],
        type: 'activity',
        imageUrl: 'https://images.unsplash.com/photo-1535083252457-6080fe29be45?q=80&w=800&auto=format&fit=crop'
      },
      {
        id: 'q-other',
        title: '休闲漫步',
        content: '1. 劳动湖：看冬捕或冰面玩耍。\n2. 卜奎清真寺：古老的建筑群。\n3. 伴手礼：飞鹤奶粉、真空包装拌肉、北大仓酒。',
        type: 'itinerary',
        imageUrl: 'https://images.unsplash.com/photo-1480497490787-505ec076689f?q=80&w=800&auto=format&fit=crop'
      }
    ]
  },
  tips: {
    id: 'tips',
    title: '生存指南 & 装备',
    description: '防寒与避坑',
    items: [
      {
        id: 't-electronic',
        title: '【重要】电子设备保暖',
        content: '手机在室外极易冻关机（尤其是iPhone）。\n1. 贴暖宝宝在手机背面。\n2. 不用时立刻放回内层口袋。\n3. 携带大容量充电宝。\n4. 进屋前把相机/手机放入密封袋，防止冷凝水损坏电路。',
        tags: ['数码', '紧急'],
        type: 'alert',
        imageUrl: 'https://images.unsplash.com/photo-1512428559087-560fa5ce7d02?q=80&w=800&auto=format&fit=crop'
      },
      {
        id: 't-gear',
        title: '衣物穿搭公式',
        content: '鞋子：防滑、防水、加绒的高帮雪地靴（最重要）。\n下装：秋裤 + 羽绒裤 + 防风外裤。\n上装：保暖内衣 + 毛衣/抓绒 + 长款羽绒服（盖过膝盖）。\n配件：雷锋帽（护耳）、围巾、触屏手套、墨镜（防雪盲）。',
        tags: ['穿搭'],
        type: 'tips',
        imageUrl: 'https://images.unsplash.com/photo-1516762689617-e1cffcef479d?q=80&w=800&auto=format&fit=crop'
      }
    ]
  }
};