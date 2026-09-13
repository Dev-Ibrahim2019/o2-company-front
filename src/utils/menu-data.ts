export type MenuItem = {
  id: string
  name: string
  description: string
  price: number
  image: string
  category: string
  tags?: string[]
  calories?: number
  popular?: boolean
}

export type Category = {
  id: string
  name: string
  icon: string
}

export const RESTAURANT = {
  name: 'ليالي الذهب',
  tagline: 'مطبخ شرقي فاخر',
  currency: 'ر.س',
  taxRate: 0.15,
  serviceRate: 0.1,
}

export const categories: Category[] = [
  { id: 'appetizers', name: 'المقبلات', icon: 'Salad' },
  { id: 'soups', name: 'الشوربات', icon: 'Soup' },
  { id: 'grills', name: 'المشاوي', icon: 'Flame' },
  { id: 'mains', name: 'الأطباق الرئيسية', icon: 'UtensilsCrossed' },
  { id: 'drinks', name: 'المشروبات', icon: 'CupSoda' },
  { id: 'desserts', name: 'الحلويات', icon: 'CakeSlice' },
]

export const menuItems: MenuItem[] = [
  {
    id: 'hummus',
    name: 'حمّص بيروتي',
    description: 'حمّص كريمي مع زيت الزيتون البكر والصنوبر المحمّص',
    price: 22,
    image: '/dishes/hummus.png',
    category: 'appetizers',
    tags: ['نباتي'],
    calories: 320,
    popular: true,
  },
  {
    id: 'fattoush',
    name: 'فتوش',
    description: 'خضار موسمية طازجة مع خبز مقرمش ودبس الرمان والسماق',
    price: 26,
    image: '/dishes/fattoush.png',
    category: 'appetizers',
    tags: ['نباتي', 'صحي'],
    calories: 210,
  },
  {
    id: 'sambousek',
    name: 'سمبوسك مشكّل',
    description: 'عجينة ذهبية مقرمشة محشوة بالجبن واللحم مع صلصة خاصة',
    price: 28,
    image: '/dishes/sambousek.png',
    category: 'appetizers',
    calories: 480,
    popular: true,
  },
  {
    id: 'lentil-soup',
    name: 'شوربة العدس',
    description: 'عدس أحمر كريمي مع الكمون والخبز المحمّص وشريحة ليمون',
    price: 18,
    image: '/dishes/lentil-soup.png',
    category: 'soups',
    tags: ['نباتي', 'ساخن'],
    calories: 240,
  },
  {
    id: 'mixed-grill',
    name: 'مشاوي مشكّلة',
    description: 'ريش غنم، كفتة، وشيش طاووق مع خضار مشوية وأرز',
    price: 89,
    image: '/dishes/mixed-grill.png',
    category: 'grills',
    tags: ['الأكثر طلباً'],
    calories: 920,
    popular: true,
  },
  {
    id: 'shish-tawook',
    name: 'شيش طاووق',
    description: 'أسياخ دجاج متبّلة مشوية على الفحم مع صلصة الثوم',
    price: 54,
    image: '/dishes/shish-tawook.png',
    category: 'grills',
    calories: 610,
  },
  {
    id: 'kabsa',
    name: 'كبسة دجاج',
    description: 'أرز بالزعفران مع دجاج محمّر والمكسرات والزبيب',
    price: 62,
    image: '/dishes/kabsa.png',
    category: 'mains',
    tags: ['طبق اليوم'],
    calories: 780,
    popular: true,
  },
  {
    id: 'mansaf',
    name: 'منسف لحم',
    description: 'لحم غنم مع صلصة الجميد فوق أرز الزعفران واللوز والصنوبر',
    price: 95,
    image: '/dishes/mansaf.png',
    category: 'mains',
    calories: 1050,
  },
  {
    id: 'lemon-mint',
    name: 'ليمون بالنعناع',
    description: 'عصير ليمون طازج منعش مع النعناع والثلج',
    price: 16,
    image: '/dishes/lemon-mint.png',
    category: 'drinks',
    tags: ['منعش'],
    calories: 90,
    popular: true,
  },
  {
    id: 'arabic-coffee',
    name: 'قهوة عربية',
    description: 'قهوة عربية أصيلة تُقدّم في دلّة ذهبية مع التمر',
    price: 20,
    image: '/dishes/arabic-coffee.png',
    category: 'drinks',
    calories: 15,
  },
  {
    id: 'kunafa',
    name: 'كنافة بالجبن',
    description: 'كنافة ذهبية مع الجبن الذائب والفستق الحلبي والقطر',
    price: 34,
    image: '/dishes/kunafa.png',
    category: 'desserts',
    tags: ['الأكثر طلباً'],
    calories: 560,
    popular: true,
  },
]

export function getItemsByCategory(categoryId: string) {
  return menuItems.filter((item) => item.category === categoryId)
}

export function getItemById(id: string) {
  return menuItems.find((item) => item.id === id)
}
