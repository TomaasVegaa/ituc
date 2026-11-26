/**
 * Configuración centralizada de iTuc Cel.
 * Actualizá teléfonos, horarios o enlaces en un solo lugar.
 */
window.ITUC_CONFIG = {
  brand: {
    name: 'iTuc Cel',
    tagline: 'Apple Store & Service Técnico',
    instagramHandle: '@ituc.cel',
    instagramUrl: 'https://www.instagram.com/ituc.cel/?hl=es',
  },
  branches: {
    tucuman: {
      id: 'tucuman',
      name: 'Tucumán',
      shortAddress: 'Junín 67',
      city: 'San Miguel de Tucumán',
      address: 'Batalla de Junín 67, Piso 4 · Of. D',
      hours: 'Lun a Vie 9:00–21:00 · Sáb 10:00–17:00',
      whatsappNumber: '5493814726242',
      whatsappDisplay: '+54 381 472-6242',
      mapEmbedUrl:
        'https://maps.google.com/maps?q=Batalla+de+Junin+67,+San+Miguel+de+Tucuman,+Argentina&t=&z=16&ie=UTF8&iwloc=&output=embed',
      mapDirectUrl:
        'https://www.google.com/maps/search/?api=1&query=Batalla+de+Junin+67,+San+Miguel+de+Tucuman,+Argentina',
    },
    salta: {
      id: 'salta',
      name: 'Salta',
      shortAddress: 'Brown 340',
      city: 'Salta Capital',
      address: 'Almirante Brown 340',
      // Horario de referencia demo: confirmar con la sucursal
      hours: 'Lun a Vie 9:30–20:30 · Sáb 10:00–14:00',
      // TODO: Reemplazar por número oficial de WhatsApp Salta
      whatsappNumber: '5493874000000',
      whatsappDisplay: 'WhatsApp Directo · Salta',
      mapEmbedUrl:
        'https://maps.google.com/maps?q=Almirante+Brown+340,+Salta,+Argentina&t=&z=16&ie=UTF8&iwloc=&output=embed',
      mapDirectUrl:
        'https://www.google.com/maps/search/?api=1&query=Almirante+Brown+340,+Salta,+Argentina',
    },
  },
};
