export interface EventType {
  name: string;
  description: string;
}

export interface EventCategory {
  category: string;
  types: EventType[];
}

export const EVENT_TYPES: EventCategory[] = [
  {
    category: "ANGEL TREE",
    types: [
      {
        name: "Gift Drop-Off",
        description: "Drop off unwrapped gifts or gift cards for Angel Tree recipients during scheduled drop-off times."
      },
      {
        name: "Gift Organization, Preparation, and Wrapping",
        description: "Sort, label, organize, and wrap gifts to ensure each child's items are complete and ready for distribution."
      }
    ]
  },
  {
    category: "COMMUNITY DISTRIBUTION",
    types: [
      {
        name: "Event Setup",
        description: "Help set up stations, signage, tables, and supplies to create a smooth and welcoming event experience."
      },
      {
        name: "Event Day Volunteering",
        description: "Assist with registration, guide families through stations, distribute items, and support families throughout the event."
      }
    ]
  },
  {
    category: "FACILITY NEEDS",
    types: [
      {
        name: "Inventory and Facility Organization",
        description: "Organize clothing, food, and supplies by sorting, labeling, shelving, and maintaining an orderly facility."
      },
      {
        name: "Truck Loading / Unloading",
        description: "Assist with loading and unloading trucks for events, deliveries, or donations. Lifting boxes or totes may be required."
      }
    ]
  },
  {
    category: "MEALS² PROGRAM",
    types: [
      {
        name: "Sort, Inventory, and Pack Food Boxes",
        description: "Sort food donations, inventory supplies, and pack food boxes for families in need."
      },
      {
        name: "Food Drop-Off",
        description: "Deliver food donations collected from your neighborhood, workplace, school, or organization during designated times."
      },
      {
        name: "Host a Food Drive",
        description: "Organize and host a food drive in your community, workplace, school, or church to support the Meals² program."
      }
    ]
  },
  {
    category: "SUMMERFEST",
    types: [
      {
        name: "Clothing Drop-Off",
        description: "Drop off donated clothing, shoes, backpacks, and supplies during designated time slots."
      },
      {
        name: "Sorting and Preparing Clothing Donations",
        description: "Sort, size, label, and prepare clothing and supplies for SummerFest distributions."
      }
    ]
  },
  {
    category: "FUNDRAISING",
    types: [
      {
        name: "Fundraiser Pre-Event Preparation",
        description: "Prepare materials, signage, packets, and raffle items in advance of fundraising events."
      },
      {
        name: "Fundraiser Event Support / Execution",
        description: "Support fundraising events through registration, activities, hospitality, logistics, or youth programs."
      }
    ]
  },
  {
    category: "IH2 STAFF ADMINISTRATION / TIMECLOCK",
    types: [
      {
        name: "Administrative Support / TimeClock Assistance",
        description: "Support IH2 staff with data entry, scheduling, check-in, and time-tracking tasks as needed."
      }
    ]
  }
];

// Helper function to get all event types as a flat array
export const getAllEventTypes = (): EventType[] => {
  return EVENT_TYPES.flatMap(category => category.types);
};

// Helper function to get event type by name
export const getEventTypeByName = (name: string): EventType | undefined => {
  return getAllEventTypes().find(type => type.name === name);
};

// Helper function to get category for an event type
export const getCategoryForEventType = (eventTypeName: string): string | undefined => {
  for (const category of EVENT_TYPES) {
    if (category.types.some(type => type.name === eventTypeName)) {
      return category.category;
    }
  }
  return undefined;
};
