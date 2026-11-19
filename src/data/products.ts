import heroBannerImg from '../assets/images/hero_unimart_campus_1794549237564.jpg';
import p01Img from '../assets/images/p01_kurkure_pack_1794549237789.jpg';
import p02Img from '../assets/images/p02_lays_combo_1794549237203.jpg';
import p03Img from '../assets/images/p03_oreo_chocolate_1794549237876.jpg';
import p04Img from '../assets/images/p04_nescafe_coffee_1794549238493.jpg';
import p05Img from '../assets/images/p05_energy_drinks_1794549238387.jpg';
import p06Img from '../assets/images/p06_masala_chai_1794549240027.jpg';
import p07Img from '../assets/images/p07_maggi_multipack_1794549240427.jpg';
import p08Img from '../assets/images/p08_cup_soups_1794549240190.jpg';
import p09Img from '../assets/images/p09_oats_cuppa_combo_1794549241140.jpg';
import p10Img from '../assets/images/p10_shampoo_bottle_1794549240607.jpg';
import p11Img from '../assets/images/p11_grooming_combo_1794549241181.jpg';
import p12Img from '../assets/images/p12_skincare_pack_1794549243054.jpg';
import p13Img from '../assets/images/p13_spiral_notebooks_1794549241787.jpg';
import p14Img from '../assets/images/p14_gel_pens_kit_1794549242731.jpg';
import p15Img from '../assets/images/p15_calculator_pad_1794549243485.jpg';
import p16Img from '../assets/images/p16_bucket_mug_set_1794549243036.jpg';
import p17Img from '../assets/images/p17_cotton_bedsheet_1794549243143.jpg';
import p18Img from '../assets/images/p18_led_desk_lamp_1794549243772.jpg';
import p19Img from '../assets/images/p19_detergent_pack_1794549243338.jpg';
import p20Img from '../assets/images/p20_hangers_hooks_1794549244932.jpg';
import p21Img from '../assets/images/p21_laundry_basket_1794549246175.jpg';
import p22Img from '../assets/images/p22_usb_charger_cable_1794549245390.jpg';
import p23Img from '../assets/images/p23_extension_board_1794549246761.jpg';
import p24Img from '../assets/images/p24_electric_kettle_1794549246445.jpg';
import p25Img from '../assets/images/p25_antiseptic_sanitizer_1794549247195.jpg';
import p26Img from '../assets/images/p26_oral_care_kit_1794549247197.jpg';
import p27Img from '../assets/images/p27_freshener_towel_1794549247522.jpg';
import p28Img from '../assets/images/p28_laptop_backpack_1794549247977.jpg';
import p29Img from '../assets/images/p29_steel_bottle_1794549248527.jpg';
import p30Img from '../assets/images/p30_brass_padlock_1794549248816.jpg';
import p31Img from '../assets/images/p31_bhujia_dal_pack_1794549923662.jpg';
import p32Img from '../assets/images/p32_bourbon_butter_cookies_1794549924251.jpg';
import p33Img from '../assets/images/p33_flavoured_milk_pack_1794549924683.jpg';
import p34Img from '../assets/images/p34_bournvita_pouch_1794549925027.jpg';
import p35Img from '../assets/images/p35_ready_meals_combo_1794549925973.jpg';
import p36Img from '../assets/images/p36_cornflakes_peanut_butter_1794549926116.jpg';
import p37Img from '../assets/images/p37_lotion_lipbalm_1794549927200.jpg';
import p38Img from '../assets/images/p38_razor_shaving_foam_1794549927094.jpg';
import p39Img from '../assets/images/p39_sticky_notes_files_1794549927232.jpg';
import p40Img from '../assets/images/p40_desk_stationery_caddy_1794549927714.jpg';
import p41Img from '../assets/images/p41_hostel_pillow_cover_1794549928789.jpg';
import p42Img from '../assets/images/p42_foldable_bed_table_1794549929521.jpg';
import p43Img from '../assets/images/p43_fabric_conditioner_bar_1794549929298.jpg';
import p44Img from '../assets/images/p44_clip_sock_hanger_1794549929311.jpg';
import p45Img from '../assets/images/p45_power_bank_20000mah_1794549929808.jpg';
import p46Img from '../assets/images/p46_wireless_neckband_1794549930496.jpg';
import p47Img from '../assets/images/p47_facial_tissues_wipes_1794549931894.jpg';
import p48Img from '../assets/images/p48_odonil_handwash_1794549931446.jpg';
import p49Img from '../assets/images/p49_duffel_travel_bag_1794549931773.jpg';
import p50Img from '../assets/images/p50_umbrella_raincover_1794549932309.jpg';

import {
  CATEGORIES,
  COMBO_OFFERS,
  INITIAL_COUPONS,
  RAW_PRODUCTS,
  TESTIMONIALS,
} from './catalogData.ts';
import type { CategoryId, Product } from '../types.ts';

export { CATEGORIES, COMBO_OFFERS, INITIAL_COUPONS, TESTIMONIALS };

export const HERO_BANNER_IMAGE = heroBannerImg;

export const IMAGE_BY_FILENAME: Record<string, string> = {
  'hero_unimart_campus_1794549237564.jpg': heroBannerImg,
  'p01_kurkure_pack_1794549237789.jpg': p01Img,
  'p02_lays_combo_1794549237203.jpg': p02Img,
  'p03_oreo_chocolate_1794549237876.jpg': p03Img,
  'p04_nescafe_coffee_1794549238493.jpg': p04Img,
  'p05_energy_drinks_1794549238387.jpg': p05Img,
  'p06_masala_chai_1794549240027.jpg': p06Img,
  'p07_maggi_multipack_1794549240427.jpg': p07Img,
  'p08_cup_soups_1794549240190.jpg': p08Img,
  'p09_oats_cuppa_combo_1794549241140.jpg': p09Img,
  'p10_shampoo_bottle_1794549240607.jpg': p10Img,
  'p11_grooming_combo_1794549241181.jpg': p11Img,
  'p12_skincare_pack_1794549243054.jpg': p12Img,
  'p13_spiral_notebooks_1794549241787.jpg': p13Img,
  'p14_gel_pens_kit_1794549242731.jpg': p14Img,
  'p15_calculator_pad_1794549243485.jpg': p15Img,
  'p16_bucket_mug_set_1794549243036.jpg': p16Img,
  'p17_cotton_bedsheet_1794549243143.jpg': p17Img,
  'p18_led_desk_lamp_1794549243772.jpg': p18Img,
  'p19_detergent_pack_1794549243338.jpg': p19Img,
  'p20_hangers_hooks_1794549244932.jpg': p20Img,
  'p21_laundry_basket_1794549246175.jpg': p21Img,
  'p22_usb_charger_cable_1794549245390.jpg': p22Img,
  'p23_extension_board_1794549246761.jpg': p23Img,
  'p24_electric_kettle_1794549246445.jpg': p24Img,
  'p25_antiseptic_sanitizer_1794549247195.jpg': p25Img,
  'p26_oral_care_kit_1794549247197.jpg': p26Img,
  'p27_freshener_towel_1794549247522.jpg': p27Img,
  'p28_laptop_backpack_1794549247977.jpg': p28Img,
  'p29_steel_bottle_1794549248527.jpg': p29Img,
  'p30_brass_padlock_1794549248816.jpg': p30Img,
  'p31_bhujia_dal_pack_1794549923662.jpg': p31Img,
  'p32_bourbon_butter_cookies_1794549924251.jpg': p32Img,
  'p33_flavoured_milk_pack_1794549924683.jpg': p33Img,
  'p34_bournvita_pouch_1794549925027.jpg': p34Img,
  'p35_ready_meals_combo_1794549925973.jpg': p35Img,
  'p36_cornflakes_peanut_butter_1794549926116.jpg': p36Img,
  'p37_lotion_lipbalm_1794549927200.jpg': p37Img,
  'p38_razor_shaving_foam_1794549927094.jpg': p38Img,
  'p39_sticky_notes_files_1794549927232.jpg': p39Img,
  'p40_desk_stationery_caddy_1794549927714.jpg': p40Img,
  'p41_hostel_pillow_cover_1794549928789.jpg': p41Img,
  'p42_foldable_bed_table_1794549929521.jpg': p42Img,
  'p43_fabric_conditioner_bar_1794549929298.jpg': p43Img,
  'p44_clip_sock_hanger_1794549929311.jpg': p44Img,
  'p45_power_bank_20000mah_1794549929808.jpg': p45Img,
  'p46_wireless_neckband_1794549930496.jpg': p46Img,
  'p47_facial_tissues_wipes_1794549931894.jpg': p47Img,
  'p48_odonil_handwash_1794549931446.jpg': p48Img,
  'p49_duffel_travel_bag_1794549931773.jpg': p49Img,
  'p50_umbrella_raincover_1794549932309.jpg': p50Img,
};

export const INITIAL_PRODUCTS: Product[] = RAW_PRODUCTS.map((p) => ({
  ...p,
  image: IMAGE_BY_FILENAME[p.image] ?? p.image,
}));

export const INITIAL_IMAGE_BY_ID = new Map(
  INITIAL_PRODUCTS.map((p) => [p.id, p.image])
);

export function resolveProductImage(
  productId: string,
  rawImage?: string,
  category?: CategoryId
): string {
  const byId = INITIAL_IMAGE_BY_ID.get(productId);
  if (byId) return byId;
  if (rawImage && IMAGE_BY_FILENAME[rawImage]) {
    return IMAGE_BY_FILENAME[rawImage];
  }
  if (rawImage && (rawImage.startsWith('http') || rawImage.startsWith('/') || rawImage.startsWith('data:'))) {
    return rawImage;
  }
  if (category) {
    const catProd = INITIAL_PRODUCTS.find((p) => p.category === category);
    if (catProd) return catProd.image;
  }
  return p01Img;
}
