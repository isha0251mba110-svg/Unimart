import { University } from '../types';

export const INITIAL_UNIVERSITIES: University[] = [
  {
    id: 'uni-dgu',
    name: 'DBS Global University',
    shortName: 'DGU Dehradun',
    campuses: [
      {
        id: 'dgu-selaqui',
        name: 'Selaqui Main Campus',
        city: 'Dehradun',
        hostels: ['Aarav Boys Hostel', 'Shivalik Girls Hostel', 'Himalaya PG Residency', 'Oakwood Scholars Block'],
        blocks: ['Block A', 'Block B', 'Block C', 'Block D'],
        deliveryFee: 19,
        freeDeliveryAbove: 299,
        dispatchWindow: '20–35 mins to Hostel Gate',
      },
      {
        id: 'dgu-rajpur',
        name: 'Rajpur Road Extension',
        city: 'Dehradun',
        hostels: ['Doon Crest Hostel', 'Pine View Girls Hostel'],
        blocks: ['North Wing', 'South Wing'],
        deliveryFee: 25,
        freeDeliveryAbove: 399,
        dispatchWindow: '30–45 mins to Hostel Gate',
      },
    ],
  },
  {
    id: 'uni-iitd',
    name: 'Indian Institute of Technology Delhi',
    shortName: 'IIT Delhi',
    campuses: [
      {
        id: 'iitd-hauzkhas',
        name: 'Hauz Khas Campus',
        city: 'New Delhi',
        hostels: ['Karakoram Hostel', 'Nilgiri Hostel', 'Kailash Girls Hostel', 'Himadri Hostel', 'Udaigiri Hostel'],
        blocks: ['East Wing', 'West Wing', 'Central Block', 'Annex'],
        deliveryFee: 15,
        freeDeliveryAbove: 249,
        dispatchWindow: '15–25 mins to Hostel Porch',
      },
    ],
  },
  {
    id: 'uni-mit',
    name: 'Manipal Institute of Technology',
    shortName: 'MIT Manipal',
    campuses: [
      {
        id: 'mit-main',
        name: 'Manipal Main Campus',
        city: 'Manipal',
        hostels: ['Block 14 Residency', 'Block 16 Scholars', 'Block 17 Twin Tower', 'Indira Girls Hostel'],
        blocks: ['Tower 1', 'Tower 2', 'Floor 1–4', 'Floor 5–8'],
        deliveryFee: 19,
        freeDeliveryAbove: 299,
        dispatchWindow: '20–30 mins to Hostel Reception',
      },
    ],
  },
  {
    id: 'uni-vit',
    name: 'Vellore Institute of Technology',
    shortName: 'VIT Vellore',
    campuses: [
      {
        id: 'vit-vellore',
        name: 'Katpadi Main Campus',
        city: 'Vellore',
        hostels: ['Men’s Hostel Q-Block', 'Men’s Hostel R-Block', 'Ladies Hostel E-Block', 'Ladies Hostel G-Block'],
        blocks: ['Wing 1', 'Wing 2', 'Annex A', 'Annex B'],
        deliveryFee: 19,
        freeDeliveryAbove: 299,
        dispatchWindow: '25–40 mins to Main Gate',
      },
    ],
  },
];

export const ALL_CAMPUS_IDS = INITIAL_UNIVERSITIES.flatMap((u) =>
  u.campuses.map((c) => c.id)
);
