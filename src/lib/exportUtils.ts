import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import type { ItineraryDay, Accommodation, Activity, Dining, Transportation } from './database.types';
import { safeParseInt } from './numberValidation';

interface DayWithData extends ItineraryDay {
  accommodations: Accommodation[];
  transportation: Transportation[];
  activities: Activity[];
  dining: Dining[];
}

const COLORS = {
  primary: [139, 95, 63],
  secondary: [186, 159, 132],
  accent: [217, 186, 154],
  text: [45, 38, 32],
  lightText: [120, 105, 95],
  background: [250, 248, 245],
  hotel: [139, 95, 63],
  activity: [173, 136, 99],
  dining: [107, 142, 123],
  divider: [217, 186, 154],
  headerBg: [250, 246, 240],
};

export type ItineraryItem = {
  type: 'accommodation' | 'transportation' | 'activity' | 'dining';
  data: Accommodation | Transportation | Activity | Dining;
  sortTime: number;
};

function parseTime(timeString: string | null | undefined): number | null {
  if (!timeString || timeString === 'To be determined') return null;

  const match = timeString.match(/(\d{1,2}):(\d{2})/);
  if (match) {
    const hours = safeParseInt(match[1], 0) || 0;
    const minutes = safeParseInt(match[2], 0) || 0;
    return hours * 60 + minutes;
  }
  return null;
}

function getMealTypeTime(mealType: string | null | undefined): number {
  const mealType_lower = mealType?.toLowerCase();
  if (mealType_lower === 'breakfast') return 7 * 60;
  if (mealType_lower === 'lunch') return 12 * 60;
  if (mealType_lower === 'dinner') return 19 * 60;
  return 12 * 60;
}

function getTypePriority(item: ItineraryItem): number {
  if (item.type === 'dining') {
    const meal = item.data as Dining;
    if (meal.meal_type === 'breakfast') return 0;
    if (meal.meal_type === 'lunch') return 2;
    if (meal.meal_type === 'dinner') return 4;
    return 1;
  }
  if (item.type === 'activity') {
    const activity = item.data as Activity;
    const timeInMinutes = parseTime(activity.activity_time);
    if (timeInMinutes !== null && timeInMinutes < 13 * 60) return 1;
    return 3;
  }
  if (item.type === 'transportation') return -1;
  if (item.type === 'accommodation') return 5;
  return 6;
}

export function sortDayItemsChronologically(day: DayWithData): ItineraryItem[] {
  const items: ItineraryItem[] = [];

  day.accommodations.forEach((accom) => {
    const checkInTime = parseTime(accom.check_in_time);
    items.push({
      type: 'accommodation',
      data: accom,
      sortTime: checkInTime !== null ? checkInTime : 21 * 60,
    });
  });

  day.transportation.forEach((trans) => {
    items.push({
      type: 'transportation',
      data: trans,
      sortTime: 1,
    });
  });

  day.activities.forEach((activity) => {
    const activityTime = parseTime(activity.activity_time);
    items.push({
      type: 'activity',
      data: activity,
      sortTime: activityTime !== null ? activityTime : 999,
    });
  });

  day.dining.forEach((meal) => {
    const reservationTime = parseTime(meal.reservation_time);
    const fallbackTime = getMealTypeTime(meal.meal_type);
    items.push({
      type: 'dining',
      data: meal,
      sortTime: reservationTime !== null ? reservationTime : fallbackTime,
    });
  });

  items.sort((a, b) => {
    const priorityA = getTypePriority(a);
    const priorityB = getTypePriority(b);
    if (priorityA !== priorityB) return priorityA - priorityB;
    return a.sortTime - b.sortTime;
  });

  return items;
}

const addPremiumHeader = (doc: jsPDF, journeyName: string, subtitle: string, pageNumber?: number) => {
  doc.setFillColor(...COLORS.primary);
  doc.rect(0, 0, 210, 35, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text(journeyName, 14, 18);

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(subtitle, 14, 27);

  if (pageNumber) {
    doc.setFontSize(9);
    doc.text(`Page ${pageNumber}`, 180, 27);
  }

  doc.setTextColor(...COLORS.text);
};

const addFooter = (doc: jsPDF, pageNumber: number) => {
  const pageHeight = doc.internal.pageSize.height;

  doc.setDrawColor(...COLORS.divider);
  doc.setLineWidth(0.5);
  doc.line(14, pageHeight - 15, 196, pageHeight - 15);

  doc.setFontSize(8);
  doc.setTextColor(...COLORS.lightText);
  doc.setFont('helvetica', 'normal');
  doc.text('Desert Paths Tours', 14, pageHeight - 8);
  doc.text('Creating Unforgettable Journeys', 14, pageHeight - 4);

  doc.text(`Page ${pageNumber}`, 196, pageHeight - 8, { align: 'right' });
};

const addIcon = (doc: jsPDF, type: 'hotel' | 'activity' | 'dining', x: number, y: number) => {
  const size = 4;

  if (type === 'hotel') {
    doc.setFillColor(...COLORS.hotel);
    doc.circle(x, y, size / 2, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(7);
    doc.text('H', x - 1.2, y + 1.2);
  } else if (type === 'activity') {
    doc.setFillColor(...COLORS.activity);
    doc.circle(x, y, size / 2, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(7);
    doc.text('A', x - 1.2, y + 1.2);
  } else if (type === 'dining') {
    doc.setFillColor(...COLORS.dining);
    doc.circle(x, y, size / 2, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(7);
    doc.text('D', x - 1.2, y + 1.2);
  }

  doc.setTextColor(...COLORS.text);
};

const drawSectionIcon = (doc: jsPDF, x: number, y: number, type: 'hotel' | 'dining' | 'activity') => {
  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(0.3);

  if (type === 'hotel') {
    doc.rect(x - 1.5, y - 1.5, 3, 3, 'S');
    doc.rect(x - 1, y - 1, 2, 2, 'S');
  } else if (type === 'dining') {
    doc.circle(x, y, 1.5, 'S');
    doc.line(x - 1.5, y, x + 1.5, y);
  } else if (type === 'activity') {
    doc.line(x - 1.5, y + 1, x, y - 1.5);
    doc.line(x, y - 1.5, x + 1.5, y + 1);
    doc.line(x - 1.5, y + 1, x + 1.5, y + 1);
  }
};

export function exportDayByDayToPDF(journeyName: string, days: DayWithData[]) {
  const doc = new jsPDF();
  let isFirstPage = true;

  days.forEach((day, dayIndex) => {
    if (!isFirstPage) {
      doc.addPage();
    }
    isFirstPage = false;

    const dateStr = new Date(day.date).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });

    doc.setFillColor(...COLORS.primary);
    doc.rect(0, 0, 210, 28, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont('times', 'bold');
    doc.text(`Day ${day.day_number}`, 20, 13);

    doc.setFontSize(11);
    doc.setFont('times', 'normal');
    doc.text(day.city_destination || 'Destination', 20, 20);

    doc.setFontSize(9);
    doc.text(dateStr, 190, 20, { align: 'right' });

    interface TableCell {
      content: string;
      colSpan?: number;
      styles?: {
        fillColor?: number[];
        textColor?: number[];
        fontStyle?: string;
        fontSize?: number;
        halign?: string;
        cellPadding?: number | { top: number; bottom: number; left: number; right: number };
        minCellHeight?: number;
      };
    }
    const tableData: TableCell[][] = [];
    const hotel = day.accommodations[0];
    const breakfast = day.dining.find(m => m.meal_type?.toLowerCase() === 'breakfast');
    const lunch = day.dining.find(m => m.meal_type?.toLowerCase() === 'lunch');
    const dinner = day.dining.find(m => m.meal_type?.toLowerCase() === 'dinner');
    const activities = day.activities.sort((a, b) => {
      const timeA = parseTime(a.activity_time) || 0;
      const timeB = parseTime(b.activity_time) || 0;
      return timeA - timeB;
    });

    if (hotel) {
      tableData.push([
        {
          content: 'ACCOMMODATION',
          styles: {
            fillColor: COLORS.headerBg,
            textColor: COLORS.hotel,
            fontStyle: 'bold',
            fontSize: 9,
            halign: 'left',
            cellPadding: { top: 2, bottom: 2, left: 4, right: 4 }
          }
        },
        {
          content: '',
          styles: {
            fillColor: COLORS.headerBg,
            cellPadding: { top: 2, bottom: 2, left: 4, right: 4 }
          }
        }
      ]);
      tableData.push([
        {
          content: hotel.hotel_name || 'Hotel',
          styles: {
            fontStyle: 'bold',
            fontSize: 11,
            textColor: COLORS.text,
            cellPadding: { top: 2, bottom: 0, left: 4, right: 4 }
          }
        },
        {
          content: hotel.check_in_time || '',
          styles: {
            fontSize: 9,
            textColor: COLORS.lightText,
            halign: 'right',
            cellPadding: { top: 2, bottom: 0, left: 4, right: 4 }
          }
        }
      ]);
      if (hotel.location_address) {
        tableData.push([
          {
            content: hotel.location_address,
            colSpan: 2,
            styles: {
              fontSize: 8,
              textColor: COLORS.lightText,
              cellPadding: { top: 0, bottom: 2, left: 4, right: 4 }
            }
          }
        ]);
      } else {
        tableData.push([
          {
            content: '',
            colSpan: 2,
            styles: { minCellHeight: 0.5, cellPadding: { top: 0, bottom: 2, left: 0, right: 0 } }
          }
        ]);
      }
    }

    if (breakfast) {
      tableData.push([
        {
          content: 'BREAKFAST',
          styles: {
            fillColor: COLORS.headerBg,
            textColor: COLORS.dining,
            fontStyle: 'bold',
            fontSize: 9,
            halign: 'left',
            cellPadding: { top: 2, bottom: 2, left: 4, right: 4 }
          }
        },
        {
          content: '',
          styles: {
            fillColor: COLORS.headerBg,
            cellPadding: { top: 2, bottom: 2, left: 4, right: 4 }
          }
        }
      ]);
      tableData.push([
        {
          content: breakfast.restaurant_name || 'Restaurant',
          styles: {
            fontStyle: 'bold',
            fontSize: 10,
            textColor: COLORS.text,
            cellPadding: { top: 2, bottom: 0, left: 4, right: 4 }
          }
        },
        {
          content: breakfast.reservation_time || '',
          styles: {
            fontSize: 9,
            textColor: COLORS.lightText,
            halign: 'right',
            cellPadding: { top: 2, bottom: 0, left: 4, right: 4 }
          }
        }
      ]);
      if (breakfast.location_address) {
        tableData.push([
          {
            content: breakfast.location_address,
            colSpan: 2,
            styles: {
              fontSize: 8,
              textColor: COLORS.lightText,
              cellPadding: { top: 0, bottom: 2, left: 4, right: 4 }
            }
          }
        ]);
      } else {
        tableData.push([
          {
            content: '',
            colSpan: 2,
            styles: { minCellHeight: 0.5, cellPadding: { top: 0, bottom: 2, left: 0, right: 0 } }
          }
        ]);
      }
    }

    activities.forEach((activity, idx) => {
      const activityTime = parseTime(activity.activity_time) || 0;

      if (idx === 0 || (lunch && activityTime >= (parseTime(lunch.reservation_time) || 12 * 60))) {
        if (lunch && !tableData.some(row => row[0]?.content === 'LUNCH')) {
          tableData.push([
            {
              content: 'LUNCH',
              styles: {
                fillColor: COLORS.headerBg,
                textColor: COLORS.dining,
                fontStyle: 'bold',
                fontSize: 9,
                halign: 'left',
                cellPadding: { top: 2, bottom: 2, left: 4, right: 4 }
              }
            },
            {
              content: '',
              styles: {
                fillColor: COLORS.headerBg,
                cellPadding: { top: 2, bottom: 2, left: 4, right: 4 }
              }
            }
          ]);
          tableData.push([
            {
              content: lunch.restaurant_name || 'Restaurant',
              styles: {
                fontStyle: 'bold',
                fontSize: 10,
                textColor: COLORS.text,
                cellPadding: { top: 2, bottom: 0, left: 4, right: 4 }
              }
            },
            {
              content: lunch.reservation_time || '',
              styles: {
                fontSize: 9,
                textColor: COLORS.lightText,
                halign: 'right',
                cellPadding: { top: 2, bottom: 0, left: 4, right: 4 }
              }
            }
          ]);
          if (lunch.location_address) {
            tableData.push([
              {
                content: lunch.location_address,
                colSpan: 2,
                styles: {
                  fontSize: 8,
                  textColor: COLORS.lightText,
                  cellPadding: { top: 0, bottom: 2, left: 4, right: 4 }
                }
              }
            ]);
          } else {
            tableData.push([
              {
                content: '',
                colSpan: 2,
                styles: { minCellHeight: 0.5, cellPadding: { top: 0, bottom: 2, left: 0, right: 0 } }
              }
            ]);
          }
        }
      }

      tableData.push([
        {
          content: 'ACTIVITY',
          styles: {
            fillColor: COLORS.headerBg,
            textColor: COLORS.activity,
            fontStyle: 'bold',
            fontSize: 9,
            halign: 'left',
            cellPadding: { top: 2, bottom: 2, left: 4, right: 4 }
          }
        },
        {
          content: '',
          styles: {
            fillColor: COLORS.headerBg,
            cellPadding: { top: 2, bottom: 2, left: 4, right: 4 }
          }
        }
      ]);
      tableData.push([
        {
          content: activity.activity_name || 'Activity',
          styles: {
            fontStyle: 'bold',
            fontSize: 10,
            textColor: COLORS.text,
            cellPadding: { top: 2, bottom: 0, left: 4, right: 4 }
          }
        },
        {
          content: activity.activity_time || '',
          styles: {
            fontSize: 9,
            textColor: COLORS.lightText,
            halign: 'right',
            cellPadding: { top: 2, bottom: 0, left: 4, right: 4 }
          }
        }
      ]);

      const hasLocation = activity.location;
      const hasDescription = activity.client_description;

      if (hasLocation) {
        tableData.push([
          {
            content: activity.location,
            colSpan: 2,
            styles: {
              fontSize: 8,
              textColor: COLORS.lightText,
              cellPadding: { top: 0, bottom: hasDescription ? 1 : 2, left: 4, right: 4 }
            }
          }
        ]);
      }

      if (hasDescription) {
        tableData.push([
          {
            content: activity.client_description,
            colSpan: 2,
            styles: {
              fontSize: 8,
              textColor: COLORS.lightText,
              fontStyle: 'italic',
              cellPadding: { top: hasLocation ? 0 : 0, bottom: 2, left: 4, right: 4 }
            }
          }
        ]);
      }

      if (!hasLocation && !hasDescription) {
        tableData.push([
          {
            content: '',
            colSpan: 2,
            styles: { minCellHeight: 0.5, cellPadding: { top: 0, bottom: 2, left: 0, right: 0 } }
          }
        ]);
      }
    });

    if (lunch && !tableData.some(row => row[0]?.content === 'LUNCH')) {
      tableData.push([
        {
          content: 'LUNCH',
          styles: {
            fillColor: COLORS.headerBg,
            textColor: COLORS.dining,
            fontStyle: 'bold',
            fontSize: 9,
            halign: 'left',
            cellPadding: { top: 2, bottom: 2, left: 4, right: 4 }
          }
        },
        {
          content: '',
          styles: {
            fillColor: COLORS.headerBg,
            cellPadding: { top: 2, bottom: 2, left: 4, right: 4 }
          }
        }
      ]);
      tableData.push([
        {
          content: lunch.restaurant_name || 'Restaurant',
          styles: {
            fontStyle: 'bold',
            fontSize: 10,
            textColor: COLORS.text,
            cellPadding: { top: 2, bottom: 0, left: 4, right: 4 }
          }
        },
        {
          content: lunch.reservation_time || '',
          styles: {
            fontSize: 9,
            textColor: COLORS.lightText,
            halign: 'right',
            cellPadding: { top: 2, bottom: 0, left: 4, right: 4 }
          }
        }
      ]);
      if (lunch.location_address) {
        tableData.push([
          {
            content: lunch.location_address,
            colSpan: 2,
            styles: {
              fontSize: 8,
              textColor: COLORS.lightText,
              cellPadding: { top: 0, bottom: 2, left: 4, right: 4 }
            }
          }
        ]);
      } else {
        tableData.push([
          {
            content: '',
            colSpan: 2,
            styles: { minCellHeight: 0.5, cellPadding: { top: 0, bottom: 2, left: 0, right: 0 } }
          }
        ]);
      }
    }

    if (dinner) {
      tableData.push([
        {
          content: 'DINNER',
          styles: {
            fillColor: COLORS.headerBg,
            textColor: COLORS.dining,
            fontStyle: 'bold',
            fontSize: 9,
            halign: 'left',
            cellPadding: { top: 2, bottom: 2, left: 4, right: 4 }
          }
        },
        {
          content: '',
          styles: {
            fillColor: COLORS.headerBg,
            cellPadding: { top: 2, bottom: 2, left: 4, right: 4 }
          }
        }
      ]);
      tableData.push([
        {
          content: dinner.restaurant_name || 'Restaurant',
          styles: {
            fontStyle: 'bold',
            fontSize: 10,
            textColor: COLORS.text,
            cellPadding: { top: 2, bottom: 0, left: 4, right: 4 }
          }
        },
        {
          content: dinner.reservation_time || '',
          styles: {
            fontSize: 9,
            textColor: COLORS.lightText,
            halign: 'right',
            cellPadding: { top: 2, bottom: 0, left: 4, right: 4 }
          }
        }
      ]);
      if (dinner.location_address) {
        tableData.push([
          {
            content: dinner.location_address,
            colSpan: 2,
            styles: {
              fontSize: 8,
              textColor: COLORS.lightText,
              cellPadding: { top: 0, bottom: 2, left: 4, right: 4 }
            }
          }
        ]);
      } else {
        tableData.push([
          {
            content: '',
            colSpan: 2,
            styles: { minCellHeight: 0.5, cellPadding: { top: 0, bottom: 2, left: 0, right: 0 } }
          }
        ]);
      }
    }

    if (hotel) {
      tableData.push([
        {
          content: 'OVERNIGHT',
          styles: {
            fillColor: COLORS.headerBg,
            textColor: COLORS.hotel,
            fontStyle: 'bold',
            fontSize: 9,
            halign: 'left',
            cellPadding: { top: 2, bottom: 2, left: 4, right: 4 }
          }
        },
        {
          content: '',
          styles: {
            fillColor: COLORS.headerBg,
            cellPadding: { top: 2, bottom: 2, left: 4, right: 4 }
          }
        }
      ]);
      tableData.push([
        {
          content: `${hotel.hotel_name || 'Hotel'}`,
          colSpan: 2,
          styles: {
            fontStyle: 'bold',
            fontSize: 10,
            textColor: COLORS.text,
            cellPadding: { top: 2, bottom: 2, left: 4, right: 4 }
          }
        }
      ]);
    }

    if (tableData.length === 0) {
      tableData.push([
        {
          content: 'No activities scheduled',
          colSpan: 2,
          styles: {
            fontSize: 10,
            textColor: COLORS.lightText,
            fontStyle: 'italic',
            halign: 'center',
            cellPadding: 8
          }
        }
      ]);
    }

    autoTable(doc, {
      body: tableData,
      startY: 34,
      theme: 'plain',
      styles: {
        fontSize: 10,
        font: 'times',
        lineColor: COLORS.divider,
        lineWidth: 0.1,
      },
      columnStyles: {
        0: { cellWidth: 145 },
        1: { cellWidth: 35 }
      },
      margin: { left: 18, right: 18 },
    });

    const pageHeight = doc.internal.pageSize.height;
    doc.setDrawColor(...COLORS.divider);
    doc.setLineWidth(0.3);
    doc.line(18, pageHeight - 12, 192, pageHeight - 12);

    doc.setFontSize(7);
    doc.setTextColor(...COLORS.lightText);
    doc.setFont('times', 'italic');
    doc.text('Desert Paths Tours', 18, pageHeight - 7);

    doc.setFont('times', 'normal');
    doc.text(`Day ${day.day_number} of ${days.length}`, 192, pageHeight - 7, { align: 'right' });
  });

  const fileName = `${journeyName.replace(/[^a-z0-9]/gi, '_')}_DayByDay.pdf`;
  doc.save(fileName);
}

export function exportDayByDayToExcel(journeyName: string, days: DayWithData[]) {
  const workbook = XLSX.utils.book_new();

  const data: (string | number | Date)[][] = [];
  data.push(['Journey Name:', journeyName]);
  data.push(['Report Type:', 'Day by Day Itinerary']);
  data.push([]);

  days.forEach(day => {
    data.push([`Day ${day.day_number}`, day.city_destination, new Date(day.date).toLocaleDateString()]);
    data.push([]);

    if (day.accommodations.length > 0) {
      data.push(['Accommodations']);
      data.push(['Hotel Name', 'Location', 'Check-in Time', 'Status']);
      day.accommodations.forEach(accom => {
        data.push([
          accom.hotel_name || 'Accommodation',
          accom.location_address || 'Location to be determined',
          accom.check_in_time || 'To be determined',
          accom.booking_status || ''
        ]);
      });
      data.push([]);
    }

    if (day.activities.length > 0) {
      data.push(['Activities']);
      data.push(['Time', 'Activity Name', 'Location', 'Status']);
      day.activities.forEach(activity => {
        data.push([
          activity.activity_time || 'To be determined',
          activity.activity_name || 'Activity',
          activity.location || 'Location to be determined',
          activity.booking_status || ''
        ]);
      });
      data.push([]);
    }

    if (day.dining.length > 0) {
      data.push(['Dining']);
      data.push(['Time', 'Restaurant', 'Meal Type', 'Location', 'Status']);
      day.dining.forEach(meal => {
        data.push([
          meal.reservation_time || 'To be determined',
          meal.restaurant_name || 'Restaurant',
          meal.meal_type || '',
          meal.location_address || 'Location to be determined',
          meal.confirmation_status || ''
        ]);
      });
      data.push([]);
    }

    data.push([]);
  });

  const worksheet = XLSX.utils.aoa_to_sheet(data);

  worksheet['!cols'] = [
    { wch: 20 },
    { wch: 30 },
    { wch: 20 },
    { wch: 15 }
  ];

  XLSX.utils.book_append_sheet(workbook, worksheet, 'Day by Day');

  const fileName = `${journeyName.replace(/[^a-z0-9]/gi, '_')}_DayByDay.xlsx`;
  XLSX.writeFile(workbook, fileName);
}

interface ItineraryTableRow {
  day_number?: number;
  date?: string;
  type?: string;
  time?: string;
  name?: string;
  location?: string;
  status?: string;
}

export function exportItineraryTableToPDF(journeyName: string, tableData: ItineraryTableRow[]) {
  const doc = new jsPDF('landscape');

  doc.setFillColor(...COLORS.primary);
  doc.rect(0, 0, 297, 35, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text(journeyName, 14, 18);

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text('Complete Itinerary Table', 14, 27);

  const headers = [['Day', 'Date', 'Type', 'Time', 'Name', 'Location', 'Status']];
  const rows = tableData.map(item => [
    item.day_number || '',
    item.date ? new Date(item.date).toLocaleDateString() : '',
    item.type || '',
    item.time || '',
    item.name || '',
    item.location || '',
    item.status || ''
  ]);

  autoTable(doc, {
    head: headers,
    body: rows,
    startY: 40,
    styles: {
      fontSize: 9,
      cellPadding: 4,
      lineColor: [226, 232, 240],
      lineWidth: 0.1,
    },
    headStyles: {
      fillColor: [209, 139, 71],
      textColor: [255, 255, 255],
      fontSize: 10,
      fontStyle: 'bold',
      halign: 'left',
    },
    alternateRowStyles: {
      fillColor: [252, 250, 245],
    },
    columnStyles: {
      0: { cellWidth: 15 },
      1: { cellWidth: 30 },
      2: { cellWidth: 25 },
      3: { cellWidth: 20 },
      4: { cellWidth: 60 },
      5: { cellWidth: 70 },
      6: { cellWidth: 25 },
    },
  });

  const pageHeight = doc.internal.pageSize.height;
  doc.setDrawColor(...COLORS.divider);
  doc.setLineWidth(0.5);
  doc.line(14, pageHeight - 15, 283, pageHeight - 15);

  doc.setFontSize(8);
  doc.setTextColor(...COLORS.lightText);
  doc.setFont('helvetica', 'normal');
  doc.text('Desert Paths Tours - Creating Unforgettable Journeys', 14, pageHeight - 8);

  const fileName = `${journeyName.replace(/[^a-z0-9]/gi, '_')}_ItineraryTable.pdf`;
  doc.save(fileName);
}

export function exportItineraryTableToExcel(journeyName: string, tableData: ItineraryTableRow[]) {
  const workbook = XLSX.utils.book_new();

  const data = [
    ['Journey Name:', journeyName],
    ['Report Type:', 'Complete Itinerary Table'],
    [],
    ['Day', 'Date', 'Type', 'Time', 'Name', 'Location', 'Status']
  ];

  tableData.forEach(item => {
    data.push([
      item.day_number || '',
      item.date ? new Date(item.date).toLocaleDateString() : '',
      item.type || '',
      item.time || '',
      item.name || '',
      item.location || '',
      item.status || ''
    ]);
  });

  const worksheet = XLSX.utils.aoa_to_sheet(data);

  worksheet['!cols'] = [
    { wch: 8 },
    { wch: 15 },
    { wch: 15 },
    { wch: 10 },
    { wch: 30 },
    { wch: 30 },
    { wch: 12 }
  ];

  XLSX.utils.book_append_sheet(workbook, worksheet, 'Itinerary');

  const fileName = `${journeyName.replace(/[^a-z0-9]/gi, '_')}_ItineraryTable.xlsx`;
  XLSX.writeFile(workbook, fileName);
}

interface TimelineItem {
  id: string;
  type: 'accommodation' | 'activity' | 'dining';
  dayNumber: number;
  date: string;
  time: string;
  title: string;
  location: string;
  description?: string;
  status?: string;
  mealType?: string;
}

export function exportTimelineToPDF(journeyName: string, timelineItems: TimelineItem[]) {
  const doc = new jsPDF();
  let isFirstDay = true;

  // Group items by day
  const itemsByDay: { [key: number]: TimelineItem[] } = {};
  timelineItems.forEach(item => {
    if (!itemsByDay[item.dayNumber]) {
      itemsByDay[item.dayNumber] = [];
    }
    itemsByDay[item.dayNumber].push(item);
  });

  // Process each day
  Object.entries(itemsByDay)
    .sort(([a], [b]) => Number(a) - Number(b))
    .forEach(([dayNumber, items]) => {
      if (!isFirstDay) {
        doc.addPage();
      }
      isFirstDay = false;

      const firstItem = items[0];
      const dateStr = new Date(firstItem.date).toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
      });

      // Day header
      doc.setFillColor(...COLORS.primary);
      doc.rect(0, 0, 210, 35, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(22);
      doc.setFont('helvetica', 'bold');
      doc.text(`Day ${dayNumber}`, 14, 18);

      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.text(dateStr, 14, 27);

      // Prepare table data
      const headers = [['Time', 'Activity / Location', 'Meal', 'Notes']];
      const rows = items.map(item => {
        let activityLocation = item.title;
        if (item.location) {
          activityLocation += `\n${item.location}`;
        }

        const mealType = item.type === 'dining' && item.mealType
          ? item.mealType.charAt(0).toUpperCase() + item.mealType.slice(1)
          : '';

        const notes = item.description || '';

        return [
          item.time,
          activityLocation,
          mealType,
          notes
        ];
      });

      // Create table
      autoTable(doc, {
        head: headers,
        body: rows,
        startY: 40,
        styles: {
          fontSize: 10,
          cellPadding: 5,
          lineColor: [226, 232, 240],
          lineWidth: 0.1,
          overflow: 'linebreak',
          cellWidth: 'wrap',
        },
        headStyles: {
          fillColor: [209, 139, 71],
          textColor: [255, 255, 255],
          fontSize: 11,
          fontStyle: 'bold',
          halign: 'left',
        },
        columnStyles: {
          0: { cellWidth: 25, halign: 'center', fontStyle: 'bold' },
          1: { cellWidth: 70 },
          2: { cellWidth: 30, halign: 'center' },
          3: { cellWidth: 57 },
        },
        didParseCell: function(data) {
          // Highlight meal cells
          if (data.column.index === 2 && data.cell.raw && data.cell.raw !== '') {
            data.cell.styles.fillColor = [254, 243, 199];
            data.cell.styles.textColor = [180, 83, 9];
            data.cell.styles.fontStyle = 'bold';
          }
        },
        didDrawCell: function(data) {
          // Add meal icon for dining rows
          if (data.column.index === 0 && data.row.index >= 0) {
            const rowData = items[data.row.index];
            if (rowData && rowData.type === 'dining') {
              const cellX = data.cell.x;
              const cellY = data.cell.y;
              doc.setFillColor(...COLORS.dining);
              doc.circle(cellX + 4, cellY + data.cell.height / 2, 1.5, 'F');
            }
          }
        },
        alternateRowStyles: {
          fillColor: [252, 250, 245],
        },
      });

      // Footer
      const pageHeight = doc.internal.pageSize.height;
      doc.setDrawColor(...COLORS.divider);
      doc.setLineWidth(0.5);
      doc.line(14, pageHeight - 15, 196, pageHeight - 15);

      doc.setFontSize(8);
      doc.setTextColor(...COLORS.lightText);
      doc.setFont('helvetica', 'normal');
      doc.text('Desert Paths Tours', 14, pageHeight - 8);
      doc.text('Creating Unforgettable Journeys', 14, pageHeight - 4);

      const pageCount = Object.keys(itemsByDay).length;
      const currentPage = Object.keys(itemsByDay).indexOf(dayNumber) + 1;
      doc.text(`Day ${currentPage} of ${pageCount}`, 196, pageHeight - 8, { align: 'right' });
    });

  const fileName = `${journeyName.replace(/[^a-z0-9]/gi, '_')}_Timeline.pdf`;
  doc.save(fileName);
}

export function exportTimelineToExcel(journeyName: string, timelineItems: TimelineItem[]) {
  const workbook = XLSX.utils.book_new();

  const data = [
    ['Journey Name:', journeyName],
    ['Report Type:', 'Timeline View'],
    [],
    ['Day', 'Date', 'Time', 'Type', 'Title', 'Location', 'Status', 'Meal Type', 'Description']
  ];

  timelineItems.forEach(item => {
    data.push([
      item.dayNumber,
      new Date(item.date).toLocaleDateString(),
      item.time,
      item.type,
      item.title,
      item.location,
      item.status || '',
      item.mealType || '',
      item.description || ''
    ]);
  });

  const worksheet = XLSX.utils.aoa_to_sheet(data);

  worksheet['!cols'] = [
    { wch: 8 },
    { wch: 15 },
    { wch: 10 },
    { wch: 15 },
    { wch: 30 },
    { wch: 30 },
    { wch: 12 },
    { wch: 12 },
    { wch: 40 }
  ];

  XLSX.utils.book_append_sheet(workbook, worksheet, 'Timeline');

  const fileName = `${journeyName.replace(/[^a-z0-9]/gi, '_')}_Timeline.xlsx`;
  XLSX.writeFile(workbook, fileName);
}

export function exportSingleDayToPDF(journeyName: string, day: DayWithData) {
  const doc = new jsPDF();

  const dateStr = new Date(day.date).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  doc.setFillColor(...COLORS.primary);
  doc.rect(0, 0, 210, 35, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont('times', 'bold');
  doc.text(`Day ${day.day_number}`, 20, 15);

  doc.setFontSize(11);
  doc.setFont('times', 'normal');
  doc.text(day.city_destination || 'Destination', 20, 23);

  doc.setFontSize(9);
  doc.text(dateStr, 190, 23, { align: 'right' });

  doc.setFontSize(8);
  doc.text(journeyName, 20, 29);

  interface TableCell {
    content: string;
    colSpan?: number;
    styles?: {
      fillColor?: number[];
      textColor?: number[];
      fontStyle?: string;
      fontSize?: number;
      halign?: string;
      cellPadding?: number | { top: number; bottom: number; left: number; right: number };
      minCellHeight?: number;
    };
  }

  const tableData: TableCell[][] = [];

  const chronologicalItems = sortDayItemsChronologically(day);

  chronologicalItems.forEach((item) => {
    if (item.type === 'accommodation') {
      const accom = item.data as Accommodation;
      tableData.push([
        {
          content: 'ACCOMMODATION',
          styles: {
            fillColor: COLORS.headerBg,
            textColor: COLORS.hotel,
            fontStyle: 'bold',
            fontSize: 9,
            halign: 'left',
            cellPadding: { top: 2, bottom: 2, left: 4, right: 4 }
          }
        },
        {
          content: '',
          styles: {
            fillColor: COLORS.headerBg,
            cellPadding: { top: 2, bottom: 2, left: 4, right: 4 }
          }
        }
      ]);
      tableData.push([
        {
          content: accom.hotel_name || 'Hotel',
          styles: {
            fontStyle: 'bold',
            fontSize: 11,
            textColor: COLORS.text,
            cellPadding: { top: 2, bottom: 0, left: 4, right: 4 }
          }
        },
        {
          content: accom.check_in_time || '',
          styles: {
            fontSize: 9,
            textColor: COLORS.lightText,
            halign: 'right',
            cellPadding: { top: 2, bottom: 0, left: 4, right: 4 }
          }
        }
      ]);
      if (accom.location_address) {
        tableData.push([
          {
            content: accom.location_address,
            colSpan: 2,
            styles: {
              fontSize: 8,
              textColor: COLORS.lightText,
              cellPadding: { top: 0, bottom: 2, left: 4, right: 4 }
            }
          }
        ]);
      } else {
        tableData.push([
          {
            content: '',
            colSpan: 2,
            styles: { minCellHeight: 0.5, cellPadding: { top: 0, bottom: 2, left: 0, right: 0 } }
          }
        ]);
      }
    } else if (item.type === 'transportation') {
      const trans = item.data as Transportation;
      tableData.push([
        {
          content: 'TRANSPORTATION',
          styles: {
            fillColor: COLORS.headerBg,
            textColor: [255, 140, 0],
            fontStyle: 'bold',
            fontSize: 9,
            halign: 'left',
            cellPadding: { top: 2, bottom: 2, left: 4, right: 4 }
          }
        },
        {
          content: '',
          styles: {
            fillColor: COLORS.headerBg,
            cellPadding: { top: 2, bottom: 2, left: 4, right: 4 }
          }
        }
      ]);
      tableData.push([
        {
          content: trans.car_type || 'Transportation',
          styles: {
            fontStyle: 'bold',
            fontSize: 10,
            textColor: COLORS.text,
            cellPadding: { top: 2, bottom: 0, left: 4, right: 4 }
          }
        },
        {
          content: trans.pickup_time || '',
          styles: {
            fontSize: 9,
            textColor: COLORS.lightText,
            halign: 'right',
            cellPadding: { top: 2, bottom: 0, left: 4, right: 4 }
          }
        }
      ]);
      if (trans.notes) {
        tableData.push([
          {
            content: trans.notes,
            colSpan: 2,
            styles: {
              fontSize: 8,
              textColor: COLORS.lightText,
              cellPadding: { top: 0, bottom: 2, left: 4, right: 4 }
            }
          }
        ]);
      } else {
        tableData.push([
          {
            content: '',
            colSpan: 2,
            styles: { minCellHeight: 0.5, cellPadding: { top: 0, bottom: 2, left: 0, right: 0 } }
          }
        ]);
      }
    } else if (item.type === 'dining') {
      const meal = item.data as Dining;
      const mealTypeLabel = meal.meal_type ? meal.meal_type.toUpperCase() : 'MEAL';
      tableData.push([
        {
          content: mealTypeLabel,
          styles: {
            fillColor: COLORS.headerBg,
            textColor: COLORS.dining,
            fontStyle: 'bold',
            fontSize: 9,
            halign: 'left',
            cellPadding: { top: 2, bottom: 2, left: 4, right: 4 }
          }
        },
        {
          content: '',
          styles: {
            fillColor: COLORS.headerBg,
            cellPadding: { top: 2, bottom: 2, left: 4, right: 4 }
          }
        }
      ]);
      tableData.push([
        {
          content: meal.restaurant_name || 'Restaurant',
          styles: {
            fontStyle: 'bold',
            fontSize: 10,
            textColor: COLORS.text,
            cellPadding: { top: 2, bottom: 0, left: 4, right: 4 }
          }
        },
        {
          content: meal.reservation_time || '',
          styles: {
            fontSize: 9,
            textColor: COLORS.lightText,
            halign: 'right',
            cellPadding: { top: 2, bottom: 0, left: 4, right: 4 }
          }
        }
      ]);
      if (meal.location_address) {
        tableData.push([
          {
            content: meal.location_address,
            colSpan: 2,
            styles: {
              fontSize: 8,
              textColor: COLORS.lightText,
              cellPadding: { top: 0, bottom: 2, left: 4, right: 4 }
            }
          }
        ]);
      } else {
        tableData.push([
          {
            content: '',
            colSpan: 2,
            styles: { minCellHeight: 0.5, cellPadding: { top: 0, bottom: 2, left: 0, right: 0 } }
          }
        ]);
      }
    } else if (item.type === 'activity') {
      const activity = item.data as Activity;
      tableData.push([
        {
          content: 'ACTIVITY',
          styles: {
            fillColor: COLORS.headerBg,
            textColor: COLORS.activity,
            fontStyle: 'bold',
            fontSize: 9,
            halign: 'left',
            cellPadding: { top: 2, bottom: 2, left: 4, right: 4 }
          }
        },
        {
          content: '',
          styles: {
            fillColor: COLORS.headerBg,
            cellPadding: { top: 2, bottom: 2, left: 4, right: 4 }
          }
        }
      ]);
      tableData.push([
        {
          content: activity.activity_name || 'Activity',
          styles: {
            fontStyle: 'bold',
            fontSize: 10,
            textColor: COLORS.text,
            cellPadding: { top: 2, bottom: 0, left: 4, right: 4 }
          }
        },
        {
          content: activity.activity_time || '',
          styles: {
            fontSize: 9,
            textColor: COLORS.lightText,
            halign: 'right',
            cellPadding: { top: 2, bottom: 0, left: 4, right: 4 }
          }
        }
      ]);

      const hasLocation = activity.location;
      const hasDescription = activity.client_description;

      if (hasLocation) {
        tableData.push([
          {
            content: activity.location,
            colSpan: 2,
            styles: {
              fontSize: 8,
              textColor: COLORS.lightText,
              cellPadding: { top: 0, bottom: hasDescription ? 1 : 2, left: 4, right: 4 }
            }
          }
        ]);
      }

      if (hasDescription) {
        tableData.push([
          {
            content: activity.client_description,
            colSpan: 2,
            styles: {
              fontSize: 8,
              textColor: COLORS.lightText,
              fontStyle: 'italic',
              cellPadding: { top: hasLocation ? 0 : 0, bottom: 2, left: 4, right: 4 }
            }
          }
        ]);
      }

      if (!hasLocation && !hasDescription) {
        tableData.push([
          {
            content: '',
            colSpan: 2,
            styles: { minCellHeight: 0.5, cellPadding: { top: 0, bottom: 2, left: 0, right: 0 } }
          }
        ]);
      }
    }
  });

  if (tableData.length === 0) {
    tableData.push([
      {
        content: 'No activities scheduled',
        colSpan: 2,
        styles: {
          fontSize: 10,
          textColor: COLORS.lightText,
          fontStyle: 'italic',
          halign: 'center',
          cellPadding: 8
        }
      }
    ]);
  }

  autoTable(doc, {
    body: tableData,
    startY: 40,
    theme: 'plain',
    styles: {
      fontSize: 10,
      font: 'times',
      lineColor: COLORS.divider,
      lineWidth: 0.1,
    },
    columnStyles: {
      0: { cellWidth: 145 },
      1: { cellWidth: 35 }
    },
    margin: { left: 18, right: 18 },
  });

  const pageHeight = doc.internal.pageSize.height;
  doc.setDrawColor(...COLORS.divider);
  doc.setLineWidth(0.3);
  doc.line(18, pageHeight - 12, 192, pageHeight - 12);

  doc.setFontSize(7);
  doc.setTextColor(...COLORS.lightText);
  doc.setFont('times', 'italic');
  doc.text('Desert Paths Tours', 18, pageHeight - 7);

  doc.setFont('times', 'normal');
  doc.text(`Day ${day.day_number}`, 192, pageHeight - 7, { align: 'right' });

  const fileName = `${journeyName.replace(/[^a-z0-9]/gi, '_')}_Day${day.day_number}.pdf`;
  doc.save(fileName);
}

export function exportSingleDayToExcel(journeyName: string, day: DayWithData) {
  const workbook = XLSX.utils.book_new();

  const data: (string | number | Date)[][] = [];
  data.push(['Journey Name:', journeyName]);
  data.push(['Day:', day.day_number]);
  data.push(['Destination:', day.city_destination || '']);
  data.push(['Date:', new Date(day.date).toLocaleDateString()]);
  data.push([]);

  const chronologicalItems = sortDayItemsChronologically(day);

  chronologicalItems.forEach((item) => {
    if (item.type === 'transportation') {
      const trans = item.data as Transportation;
      data.push(['TRANSPORTATION', trans.pickup_time || '', '', '', '']);
      data.push([
        trans.car_type || 'Vehicle',
        '',
        trans.notes || '',
        '',
        ''
      ]);
      data.push([]);
    } else if (item.type === 'accommodation') {
      const accom = item.data as Accommodation;
      data.push(['ACCOMMODATION', accom.check_in_time || '', '', '', '']);
      data.push([
        accom.hotel_name || 'Accommodation',
        accom.location_address || '',
        '',
        '',
        accom.booking_status || ''
      ]);
      data.push([]);
    } else if (item.type === 'dining') {
      const meal = item.data as Dining;
      const mealType = meal.meal_type ? meal.meal_type.toUpperCase() : 'MEAL';
      data.push([mealType, meal.reservation_time || '', '', '', '']);
      data.push([
        meal.restaurant_name || 'Restaurant',
        meal.location_address || '',
        '',
        '',
        meal.confirmation_status || ''
      ]);
      data.push([]);
    } else if (item.type === 'activity') {
      const activity = item.data as Activity;
      data.push(['ACTIVITY', activity.activity_time || '', '', '', '']);
      data.push([
        activity.activity_name || 'Activity',
        activity.location || '',
        activity.client_description || '',
        '',
        activity.booking_status || ''
      ]);
      data.push([]);
    }
  });

  const worksheet = XLSX.utils.aoa_to_sheet(data);

  worksheet['!cols'] = [
    { wch: 30 },
    { wch: 30 },
    { wch: 30 },
    { wch: 20 },
    { wch: 15 }
  ];

  XLSX.utils.book_append_sheet(workbook, worksheet, `Day ${day.day_number}`);

  const fileName = `${journeyName.replace(/[^a-z0-9]/gi, '_')}_Day${day.day_number}.xlsx`;
  XLSX.writeFile(workbook, fileName);
}
