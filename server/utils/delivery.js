const VALID_DISTRICTS = [
  'Dhaka', 'Faridpur', 'Gazipur', 'Gopalganj', 'Kishoreganj', 'Madaripur', 'Manikganj', 'Munshiganj', 'Narayanganj', 'Narsingdi', 'Rajbari', 'Shariatpur', 'Tangail',
  'Bandarban', 'Brahmanbaria', 'Chandpur', 'Chattogram', 'Cumilla', 'Cox\'s Bazar', 'Feni', 'Khagrachhari', 'Lakshmipur', 'Noakhali', 'Rangamati',
  'Bogura', 'Chapainawabganj', 'Joypurhat', 'Naogaon', 'Natore', 'Pabna', 'Rajshahi', 'Sirajganj',
  'Bagerhat', 'Chuadanga', 'Jashore', 'Jhenaidah', 'Khulna', 'Kushtia', 'Magura', 'Meherpur', 'Narail', 'Satkhira',
  'Barguna', 'Barishal', 'Bhola', 'Jhalokathi', 'Patuakhali', 'Pirojpur',
  'Habiganj', 'Moulvibazar', 'Sunamganj', 'Sylhet',
  'Dinajpur', 'Gaibandha', 'Kurigram', 'Lalmonirhat', 'Nilphamari', 'Panchagarh', 'Rangpur', 'Thakurgaon',
  'Jamalpur', 'Mymensingh', 'Netrokona', 'Sherpur',
];

function normalizeDistrict(value) {
  return String(value || '').trim();
}

function isValidDistrict(value) {
  return VALID_DISTRICTS.includes(normalizeDistrict(value));
}

function calculateDeliveryCharge(district) {
  const selected = normalizeDistrict(district);
  if (!isValidDistrict(selected)) return null;
  return selected === 'Dhaka' ? 80 : 150;
}

module.exports = { VALID_DISTRICTS, isValidDistrict, calculateDeliveryCharge };
