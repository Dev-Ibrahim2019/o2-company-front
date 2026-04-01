
import { MenuItem, Table, TableStatus, Hall } from './types';

export const CATEGORIES = [
  { id: 'all', name: 'الكل', icon: '🍽️' },
  { id: 'shawarma', name: 'الشاورما', icon: '🌯' },
  { id: 'italian', name: 'الإيطالي', icon: '🍕' },
  { id: 'western', name: 'الوجبات الغربية', icon: '🍔' },
  { id: 'oriental_sweets', name: 'الحلويات الشرقية', icon: '🍯' },
  { id: 'cake', name: 'الكيك', icon: '🎂' },
  { id: 'bar_sweets', name: 'حلويات البار', icon: '🧇' },
  { id: 'drinks', name: 'المشروبات', icon: '🥤' },
  { id: 'salads', name: 'السلطات', icon: '🥗' },
  { id: 'gelato', name: 'الجيلاتو', icon: '🍦' },
];

export const DEPARTMENTS = [
  { id: 'all', name: 'الكل', icon: '🍽️' },
  { id: 'shawarma', name: 'الشاورما', icon: '🌯' },
  { id: 'italian', name: 'الإيطالي', icon: '🍕' },
  { id: 'western', name: 'الوجبات الغربية', icon: '🍔' },
  { id: 'oriental_sweets', name: 'الحلويات الشرقية', icon: '🍯' },
  { id: 'cake', name: 'الكيك', icon: '🎂' },
  { id: 'bar_sweets', name: 'حلويات البار', icon: '🧇' },
  { id: 'drinks', name: 'المشروبات', icon: '🥤' },
  { id: 'salads', name: 'السلطات', icon: '🥗' },
  { id: 'gelato', name: 'الجيلاتو', icon: '🍦' },
];

export const MENU_ITEMS: MenuItem[] = [
  // الشاورما
  { id: '101', name: 'Pita Shawarma', nameAr: 'بيتا شورما', price: 10, category: 'shawarma', departmentId: 'd-shawarma', image: 'menu/Shawarma/54.jpg' },
  { id: '102', name: 'Regular Shawarma', nameAr: 'شاورما عادي', price: 15, category: 'shawarma', departmentId: 'd-shawarma', image: 'menu/Shawarma/48.jpg' },
  { id: '103', name: 'Double Farshouha', nameAr: 'فرشوحة دبل', price: 17, category: 'shawarma', departmentId: 'd-shawarma', image: 'menu/Shawarma/49.jpg' },
  { id: '104', name: 'Double Meat Farshouha', nameAr: 'فرشوحة دبل لحمة', price: 23, category: 'shawarma', departmentId: 'd-shawarma', image: 'menu/Shawarma/48.jpg' },
  { id: '105', name: 'Double Double Farshouha', nameAr: 'فرشوحة دبل دبل', price: 25, category: 'shawarma', departmentId: 'd-shawarma', image: 'menu/Shawarma/48.jpg' },
  { id: '106', name: 'Saj Shawarma', nameAr: 'سوري', price: 28, category: 'shawarma', departmentId: 'd-shawarma', image: 'menu/Shawarma/53.jpg' },
  { id: '107', name: 'Safiha', nameAr: 'صفيحة', price: 30, category: 'shawarma', departmentId: 'd-shawarma', image: 'menu/Shawarma/51.jpg' },
  { id: '108', name: 'Bashka', nameAr: 'باشكا', price: 40, category: 'shawarma', departmentId: 'd-shawarma', image: 'menu/Shawarma/18.jpg' },
  { id: '109', name: 'Arabic Shawarma', nameAr: 'شاورما عربي', price: 30, category: 'shawarma', departmentId: 'd-shawarma', image: 'menu/Shawarma/17.jpg' },
  { id: '110', name: 'Nabulsi Shawarma', nameAr: 'شاورما نابلسي', price: 30, category: 'shawarma', departmentId: 'd-shawarma', image: 'menu/Shawarma/19.jpg' },
  { id: '111', name: 'Shawarma Plate Large', nameAr: 'صحن شاورما 30', price: 30, category: 'shawarma', departmentId: 'd-shawarma', image: 'menu/Shawarma/14.jpg' },
  { id: '112', name: 'Shawarma Plate Small', nameAr: 'صحن شاورما 20', price: 20, category: 'shawarma', departmentId: 'd-shawarma', image: 'menu/Shawarma/13.jpg' },

  // الإيطالي
  { id: '201', name: 'Chicken Calzone', nameAr: 'كاليزوني دجاج', price: 30, category: 'italian', departmentId: 'd-italian', image: 'menu/italian/91.jpeg' },
  { id: '202', name: 'Veggie Calzone', nameAr: 'كاليزوني خضار', price: 15, category: 'italian', departmentId: 'd-italian', image: 'menu/italian/36.jpg' },
  { id: '203', name: 'Mexican Chicken Pizza', nameAr: 'بيتزا مكسيكي دجاج', price: 20, category: 'italian', departmentId: 'd-italian', image: 'menu/italian/33.jpg' },
  { id: '204', name: 'Mega Pizza', nameAr: 'ميجا', price: 30, category: 'italian', departmentId: 'd-italian', image: 'menu/italian/34.jpg' },
  { id: '205', name: 'Veggie Pizza', nameAr: 'بيتزا خضار', price: 15, category: 'italian', departmentId: 'd-italian', image: 'menu/italian/32.jpg' },
  { id: '206', name: 'Mama Rosa Pineapple Pizza', nameAr: 'بيتزا ماما روزا بالاناناس', price: 15, category: 'italian', departmentId: 'd-italian', image: 'menu/italian/2.jpg' },
  { id: '207', name: 'Napoli Pizza', nameAr: 'نابولي', price: 15, category: 'italian', departmentId: 'd-italian', image: 'menu/italian/3.jpg' },
  { id: '208', name: 'Margherita Pizza', nameAr: 'مارجريتا', price: 15, category: 'italian', departmentId: 'd-italian', image: 'menu/italian/1.jpg' },
  { id: '209', name: 'Ranch Sauce', nameAr: 'صوص رانش', price: 3, category: 'italian', departmentId: 'd-italian', image: 'menu/italian/7.jpeg' },

  // الوجبات الغربية
  { id: '301', name: 'Zinger', nameAr: 'زينجر', price: 25, category: 'western', departmentId: 'd-western', image: '/menu/western/44.jpg' },
  { id: '302', name: 'Beef Burger', nameAr: 'بيف برجر', price: 25, category: 'western', departmentId: 'd-western', image: '/menu/western/40.jpg' },
  { id: '303', name: 'Big Mac', nameAr: 'بيغ ماك', price: 35, category: 'western', departmentId: 'd-western', image: '/menu/western/46.jpg' },
  { id: '304', name: 'Chicken Pizza Meal', nameAr: 'تشكن بيتزا', price: 25, category: 'western', departmentId: 'd-western', image: '/menu/western/94.jpg' },
  { id: '305', name: 'Shish Taouk', nameAr: 'شيش طاووق', price: 25, category: 'western', departmentId: 'd-western', image: '/menu/western/47.jpg' },
  { id: '306', name: 'Golden Pie', nameAr: 'فطيرة ذهبية', price: 25, category: 'western', departmentId: 'd-western', image: '/menu/western/43.jpg' },

  // الحلويات الشرقية
  { id: '401', name: 'Namoura', nameAr: 'نمورة', price: 15, category: 'oriental_sweets', departmentId: 'd-sweets', image: '/menu/sweets/25.jpeg' },
  { id: '402', name: 'Basbousa', nameAr: 'بسبوسة', price: 20, category: 'oriental_sweets', departmentId: 'd-sweets', image: '/menu/sweets/82.jpeg' },
  { id: '403', name: 'Kallaj', nameAr: 'كلاج', price: 20, category: 'oriental_sweets', departmentId: 'd-sweets', image: '/menu/sweets/3.1.jpg' },
  { id: '404', name: 'Osh El Bolbol', nameAr: 'عش البلبل', price: 30, category: 'oriental_sweets', departmentId: 'd-sweets', image: '/menu/sweets/7.jpg' },
  { id: '405', name: 'Kol Wa Oshkor', nameAr: 'كول واشكر', price: 30, category: 'oriental_sweets', departmentId: 'd-sweets', image: '/menu/sweets/5.jpg' },
  { id: '406', name: 'Sanyoura', nameAr: 'سنيورة', price: 30, category: 'oriental_sweets', departmentId: 'd-sweets', image: '/menu/sweets/8.jpg' },
  { id: '407', name: 'Arabic Kunafa', nameAr: 'كنافة عربية', price: 40, category: 'oriental_sweets', departmentId: 'd-sweets', image: '/menu/sweets/17.jpeg' },
  { id: '408', name: 'Nutella Basbousa', nameAr: 'بسبوسة نوتيلا', price: 40, category: 'oriental_sweets', departmentId: 'd-sweets', image: '/menu/sweets/18.jpeg' },
  { id: '409', name: 'Almond Baklava', nameAr: 'بقلاوة لوز', price: 48, category: 'oriental_sweets', departmentId: 'd-sweets', image: '/menu/sweets/9.jpg' },
  { id: '410', name: 'Nabulsiya', nameAr: 'نابلسية', price: 60, category: 'oriental_sweets', departmentId: 'd-sweets', image: '/menu/sweets/23.jpg' },
  { id: '411', name: 'Almond Makoufa', nameAr: 'معكوفة لوز', price: 35, category: 'oriental_sweets', departmentId: 'd-sweets', image: '/menu/sweets/6.jpg' },
  { id: '412', name: 'Almond Bracelets', nameAr: 'اساور لوز', price: 48, category: 'oriental_sweets', departmentId: 'd-sweets', image: '/menu/sweets/19.jpeg' },
  { id: '413', name: 'Sorra', nameAr: 'صرة', price: 35, category: 'oriental_sweets', departmentId: 'd-sweets', image: '/menu/sweets/2.jpg' },
  { id: '414', name: 'Warbat', nameAr: 'وربات', price: 35, category: 'oriental_sweets', departmentId: 'd-sweets', image: '/menu/sweets/26.jpg' },
  { id: '415', name: 'Walnut Makoufa', nameAr: 'معكوفة عين جمل', price: 35, category: 'oriental_sweets', departmentId: 'd-sweets', image: '/menu/sweets/4.jpg' },
  { id: '416', name: 'Walnut Baklava', nameAr: 'بقلاوة عين جمل', price: 55, category: 'oriental_sweets', departmentId: 'd-sweets', image: '/menu/sweets/41.jpg' },
  { id: '417', name: 'Aleppo Baklava', nameAr: 'بقلاوة حلبي', price: 100, category: 'oriental_sweets', departmentId: 'd-sweets', image: '/menu/sweets/10.jpg' },
  { id: '418', name: 'Nut Cups', nameAr: 'كاسات مكسرات', price: 80, category: 'oriental_sweets', departmentId: 'd-sweets', image: '/menu/sweets/24.jpg' },
  { id: '419', name: 'Aleppo Borma', nameAr: 'بورما حلبي', price: 100, category: 'oriental_sweets', departmentId: 'd-sweets', image: '/menu/sweets/78.jpeg' },
  { id: '420', name: 'Aleppo Bolouriya', nameAr: 'بولورية حلبي', price: 130, category: 'oriental_sweets', departmentId: 'd-sweets', image: '/menu/sweets/84.jpeg' },
  { id: '421', name: 'Aleppo Dolma', nameAr: 'دولمة حلبي', price: 130, category: 'oriental_sweets', departmentId: 'd-sweets', image: '/menu/sweets/27.jpg' },
  { id: '422', name: 'Aleppo Bolouriya Nutella', nameAr: 'بلورية حلبي نوتيلا', price: 130, category: 'oriental_sweets', departmentId: 'd-sweets', image: '/menu/sweets/92.jpeg' },
  { id: '423', name: 'Chocolate Dolma', nameAr: 'دولمة شوكولاتة', price: 130, category: 'oriental_sweets', departmentId: 'd-sweets', image: '/menu/sweets/74.jpg' },

  // الكيك
  { id: '501', name: 'Small Cake', nameAr: 'قالب كيك صغير', price: 60, category: 'cake', departmentId: 'd-sweets', image: '/menu/Cake/9.jpg' },
  { id: '502', name: 'Large Cake', nameAr: 'قالب كيك كبير', price: 80, category: 'cake', departmentId: 'd-sweets', image: '/menu/Cake/10.jpg' },
  { id: '503', name: 'Special Small Cake', nameAr: 'قالب كيك سبيشل صغير', price: 80, category: 'cake', departmentId: 'd-sweets', image: '/menu/Cake/38.jpg' },
  { id: '504', name: 'Special Large Cake', nameAr: 'قالب كيك سبيشل كبير', price: 100, category: 'cake', departmentId: 'd-sweets', image: '/menu/Cake/88.jpeg' },
  { id: '505', name: 'Classic Cake Piece', nameAr: 'قطع كيك كلاسيكي', price: 5, category: 'cake', departmentId: 'd-sweets', image: '/menu/Cake/5.jpg' },
  { id: '506', name: 'Swiss Roll', nameAr: 'سويس رول', price: 8, category: 'cake', departmentId: 'd-sweets', image: '/menu/Cake/31.jpg' },
  { id: '507', name: 'Tres Leches', nameAr: 'تريلتشا', price: 10, category: 'cake', departmentId: 'd-sweets', image: '/menu/Cake/21.jpg' },
  { id: '508', name: 'Special Cake Piece', nameAr: 'قطع كيك سبيشل', price: 10, category: 'cake', departmentId: 'd-sweets', image: '/menu/Cake/30.jpg' },
  { id: '509', name: 'Supreme', nameAr: 'سوبريم', price: 18, category: 'cake', departmentId: 'd-sweets', image: '/menu/Cake/28.jpg' },
  { id: '510', name: 'Crunch Bar', nameAr: 'كرانش بار', price: 15, category: 'cake', departmentId: 'd-sweets', image: '/menu/Cake/23.jpg' },
  { id: '511', name: 'Mousse', nameAr: 'موس', price: 15, category: 'cake', departmentId: 'd-sweets', image: '/menu/Cake/4.jpg' },
  { id: '512', name: 'Cheesecake', nameAr: 'تشيز كيك', price: 15, category: 'cake', departmentId: 'd-sweets', image: '/menu/Cake/7.jpg' },
  { id: '513', name: 'Half Slab Cake', nameAr: 'قالب نص بلاطة', price: 150, category: 'cake', departmentId: 'd-sweets', image: '/menu/Cake/8.1.jpg' },

  // حلويات البار
  { id: '601', name: 'Special Crepe', nameAr: 'كريب سبيشل', price: 25, category: 'bar_sweets', departmentId: 'd-sweets', image: '/menu/Bar/16.jpg' },
  { id: '602', name: 'Dubai Crepe', nameAr: 'كريب دبي', price: 30, category: 'bar_sweets', departmentId: 'd-sweets', image: '/menu/Bar/64.jpg' },
  { id: '603', name: 'Rings', nameAr: 'رينجز', price: 25, category: 'bar_sweets', departmentId: 'd-sweets', image: '/menu/Bar/14.jpg' },
  { id: '604', name: 'Special Luqaimat', nameAr: 'لقيمات سبيشل', price: 25, category: 'bar_sweets', departmentId: 'd-sweets', image: '/menu/Bar/56.jpg' },
  { id: '605', name: 'Pancake', nameAr: 'بان كيك', price: 25, category: 'bar_sweets', departmentId: 'd-sweets', image: '/menu/Bar/15.jpg' },
  { id: '606', name: 'Mini Pancake', nameAr: 'ميني بان كيك', price: 25, category: 'bar_sweets', departmentId: 'd-sweets', image: '/menu/Bar/55.jpg' },
  { id: '607', name: 'Molten Cake', nameAr: 'مولتن كيك', price: 20, category: 'bar_sweets', departmentId: 'd-sweets', image: '/menu/Bar/37.jpg' },
  { id: '608', name: 'Hot Cake', nameAr: 'هوت كيك', price: 20, category: 'bar_sweets', departmentId: 'd-sweets', image: '/menu/Bar/38.jpg' },
  { id: '609', name: 'Brownies', nameAr: 'براونيز', price: 20, category: 'bar_sweets', departmentId: 'd-sweets', image: '/menu/Bar/59.jpg' },
  { id: '610', name: 'Taiyaki', nameAr: 'تاياكي', price: 25, category: 'bar_sweets', departmentId: 'd-sweets', image: '/menu/Bar/67.jpeg' },
  { id: '611', name: 'Mini Fishes', nameAr: 'ميني فيشز', price: 25, category: 'bar_sweets', departmentId: 'd-sweets', image: '/menu/Bar/68.jpeg' },
  { id: '612', name: 'Waffle Stick', nameAr: 'وافل ستيك', price: 25, category: 'bar_sweets', departmentId: 'd-sweets', image: '/menu/Bar/85.jpeg' },
  { id: '613', name: 'Nutella Kunafa', nameAr: 'كنافة نوتيلا', price: 15, category: 'bar_sweets', departmentId: 'd-sweets', image: '/menu/Bar/58.jpg' },

  // المشروبات
  { id: '701', name: 'Seasonal Juice', nameAr: 'عصير الموسم', price: 10, category: 'drinks', departmentId: 'd-bar', image: '/menu/drinks/1.jpg' },
  { id: '702', name: 'Pineapple Juice', nameAr: 'عصير اناناس', price: 10, category: 'drinks', departmentId: 'd-bar', image: '/menu/drinks/2.jpg' },
  { id: '703', name: 'Lemon Mint', nameAr: 'ليمون ونعنع', price: 10, category: 'drinks', departmentId: 'd-bar', image: '/menu/drinks/3.jpg' },
  { id: '704', name: 'Avocado', nameAr: 'أفوكادو', price: 15, category: 'drinks', departmentId: 'd-bar', image: '/menu/drinks/4.jpg' },
  { id: '705', name: 'Cold Choco', nameAr: 'شوكو بارد', price: 10, category: 'drinks', departmentId: 'd-bar', image: '/menu/drinks/7.jpg' },
  { id: '706', name: 'Ice Mocha', nameAr: 'ايس موكا', price: 10, category: 'drinks', departmentId: 'd-bar', image: '/menu/drinks/5.jpg' },
  { id: '707', name: 'Ice Coffee', nameAr: 'ايس كافي', price: 10, category: 'drinks', departmentId: 'd-bar', image: '/menu/drinks/10.jpg' },
  { id: '708', name: 'Milkshake', nameAr: 'ميلك شيك', price: 15, category: 'drinks', departmentId: 'd-bar', image: '/menu/drinks/8.jpg' },
  { id: '709', name: 'Mojito', nameAr: 'موهيتو', price: 20, category: 'drinks', departmentId: 'd-bar', image: '/menu/drinks/16.jpg' },
  { id: '710', name: 'Nescafe', nameAr: 'نسكافيه', price: 5, category: 'drinks', departmentId: 'd-bar', image: '/menu/drinks/9.jpg' },
  { id: '711', name: 'Cappuccino', nameAr: 'كابيتشينو', price: 5, category: 'drinks', departmentId: 'd-bar', image: '/menu/drinks/9.jpg' },
  { id: '712', name: 'Single Espresso', nameAr: 'اسبريسو سينجل', price: 5, category: 'drinks', departmentId: 'd-bar', image: '/menu/drinks/6.jpg' },
  { id: '713', name: 'Double Espresso', nameAr: 'اسبريسو دبل', price: 10, category: 'drinks', departmentId: 'd-bar', image: '/menu/drinks/6.jpg' },
  { id: '714', name: 'Single Turkish Coffee', nameAr: 'قهوة تركي سينجل', price: 5, category: 'drinks', departmentId: 'd-bar', image: '/menu/drinks/6.jpg' },
  { id: '715', name: 'Double Turkish Coffee', nameAr: 'قهوة تركي دبل', price: 10, category: 'drinks', departmentId: 'd-bar', image: '/menu/drinks/6.jpg' },
  { id: '716', name: 'Tea', nameAr: 'شاي', price: 3, category: 'drinks', departmentId: 'd-bar', image: '/menu/drinks/11.jpg' },
  { id: '717', name: 'Blue', nameAr: 'بلو', price: 4, category: 'drinks', departmentId: 'd-bar', image: '/menu/drinks/17.jpg' },
  { id: '718', name: 'Coca Cola', nameAr: 'كوكا كولا', price: 5, category: 'drinks', departmentId: 'd-bar', image: '/menu/drinks/18.jpg' },
  { id: '719', name: 'Sprite', nameAr: 'سبرايت', price: 5, category: 'drinks', departmentId: 'd-bar', image: '/menu/drinks/19.jpg' },
  { id: '720', name: 'Mineral Water 200ml', nameAr: 'مياه معدنية 200ملم', price: 1, category: 'drinks', departmentId: 'd-bar', image: '/menu/drinks/12.jpg' },
  { id: '721', name: 'Mineral Water 500ml', nameAr: 'مياه معدنية 500ملم', price: 2, category: 'drinks', departmentId: 'd-bar', image: '/menu/drinks/13.jpg' },

  // السلطات
  { id: '801', name: 'Mixed Salad', nameAr: 'سلطات مشكل', price: 5, category: 'salads', departmentId: 'd-salads', image: '/menu/salad/89.jpeg' },
  { id: '802', name: 'Corn Mayo', nameAr: 'ذرة مايونيز', price: 5, category: 'salads', departmentId: 'd-salads', image: '/menu/salad/5.jpeg' },
  { id: '803', name: 'Picante', nameAr: 'بيكانتي', price: 5, category: 'salads', departmentId: 'd-salads', image: '/menu/salad/1.jpeg' },
  { id: '804', name: 'Turkish Salad', nameAr: 'تركية', price: 5, category: 'salads', departmentId: 'd-salads', image: '/menu/salad/4.jpeg' },
  { id: '805', name: 'Garlic Sauce', nameAr: 'ثومية', price: 5, category: 'salads', departmentId: 'd-salads', image: '/menu/salad/2.jpeg' },
  { id: '806', name: 'Cabbage Salad', nameAr: 'ملفوف', price: 5, category: 'salads', departmentId: 'd-salads', image: '/menu/salad/3.jpeg' },
  { id: '807', name: 'Coleslaw', nameAr: 'كول سلو', price: 5, category: 'salads', departmentId: 'd-salads', image: '/menu/salad/6.jpeg' },
  { id: '808', name: 'Potato Salad', nameAr: 'بطاطا', price: 5, category: 'salads', departmentId: 'd-salads', image: '/menu/salad/20.jpeg' },

  // الجيلاتو
  { id: '901', name: 'Nutella Gelato', nameAr: 'جيلاتو نوتيلا', price: 15, category: 'gelato', departmentId: 'd-sweets', image: '/menu/Gelato/93.jpeg' },
  { id: '902', name: 'Pistachio Gelato', nameAr: 'جيلاتو بستاشيو', price: 15, category: 'gelato', departmentId: 'd-sweets', image: '/menu/Gelato/72.jpeg' },
  { id: '903', name: 'Lotus Gelato', nameAr: 'جيلاتو لوتس', price: 15, category: 'gelato', departmentId: 'd-sweets', image: '/menu/Gelato/70.jpeg' },
  { id: '904', name: 'Kinder Gelato', nameAr: 'جيلاتو كيندر', price: 15, category: 'gelato', departmentId: 'd-sweets', image: '/menu/Gelato/95.jpeg' },
  { id: '905', name: 'Blueberry Gelato', nameAr: 'جيلاتو بلوبري', price: 15, category: 'gelato', departmentId: 'd-sweets', image: '/menu/Gelato/79.jpeg' },
  { id: '906', name: 'Arabic Gelato', nameAr: 'جيلاتو عربية', price: 15, category: 'gelato', departmentId: 'd-sweets', image: '/menu/Gelato/75.jpeg' },
];

export const HALLS: Hall[] = [
  { id: 'h1', name: 'القاعة الرئيسية' },
  { id: 'h2', name: 'التراس' },
  { id: 'h3', name: 'VIP' },
  { id: 'h4', name: 'مناسبات' },
];

export const TABLES: Table[] = Array.from({ length: 100 }, (_, i) => {
  const tableNumber = i + 1;
  let hallId = 'h1';
  if (tableNumber > 85) hallId = 'h4';
  else if (tableNumber > 70) hallId = 'h3';
  else if (tableNumber > 40) hallId = 'h2';

  const iInHall = hallId === 'h1' ? i : 
                 hallId === 'h2' ? i - 40 :
                 hallId === 'h3' ? i - 70 : i - 85;

  const row = Math.floor(iInHall / 10);
  const col = iInHall % 10;
  
  let status = TableStatus.AVAILABLE;
  let seatedAt: Date | undefined = undefined;
  let reservationName: string | undefined = undefined;
  let reservationTime: string | undefined = undefined;
  let currentOrderId: string | undefined = undefined;

  if (i === 0 || i === 5 || i === 12) {
    status = TableStatus.OCCUPIED;
    seatedAt = new Date(Date.now() - (Math.random() * 60 * 60000)); // Seated 0-60 mins ago
    if (i === 0) currentOrderId = 'o-1';
  } else if (i === 1 || i === 8) {
    status = TableStatus.PAYMENT_PENDING;
    seatedAt = new Date(Date.now() - 45 * 60000);
    if (i === 1) currentOrderId = 'o-2';
  } else if (i === 2 || i === 15) {
    status = TableStatus.RESERVED;
    reservationName = i === 2 ? 'عائلة أحمد' : 'حجز VIP';
    reservationTime = i === 2 ? '08:30 PM' : '09:00 PM';
  } else if (i === 3 || i === 19) {
    status = TableStatus.CLEANING;
  }

  return {
    id: `t-${tableNumber}`,
    number: tableNumber,
    status,
    capacity: (i % 5 === 0) ? 6 : 4,
    hallId,
    position: { x: col * 120 + 50, y: row * 120 + 50 },
    seatedAt,
    reservationName,
    reservationTime,
    currentOrderId
  };
});
