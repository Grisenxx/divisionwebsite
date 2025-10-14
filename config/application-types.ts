export interface ApplicationType {
  id: string
  name: string
  description: string
  requiredRole?: string // Discord role ID der kan se disse ansøgninger
  fields: {
    id: string
    label: string
    type: "text" | "textarea" | "number" | "select"
    placeholder?: string
    required: boolean
    options?: string[] // For select fields
    min?: number // For number fields
    rows?: number // For textarea fields
  }[]
}

export const applicationTypes: ApplicationType[] = [
   {
    id: "staff",
    name: "Staff Ansøgning",
    description: "Ansøg om at blive en del af vores staff",
    requiredRole: "1427628590580895825", // Erstat med din Discord rolle ID
    fields: [
      {
        id: "age",
        label: "Alder",
        type: "number",
        placeholder: "18",
        required: true,
        min: 15,
      },
      {
        id: "position",
        label: "Position",
        type: "select",
        required: true,
        options: ["Moderator", "Support", "Administrator", "Developer"],
      },
      {
        id: "experience",
        label: "Tidligere Erfaring",
        type: "textarea",
        placeholder: "Beskriv din tidligere erfaring med staff arbejde...",
        required: true,
        rows: 4,
      },
      {
        id: "motivation",
        label: "Hvorfor vil du være staff?",
        type: "textarea",
        placeholder: "Fortæl os hvorfor du vil være en del af vores staff team...",
        required: true,
        rows: 4,
      },
      {
        id: "availability",
        label: "Tilgængelighed",
        type: "textarea",
        placeholder: "Hvornår er du tilgængelig? (dage og tidspunkter)",
        required: true,
        rows: 3,
      },
    ],
  },
  {
    id: "firma",
    name: "Firma Ansøgning",
    description: "Ansøg om at blive en del af vores firma",
    requiredRole: "1427634587135119411", // Erstat med din Discord rolle ID
    fields: [
      {
        id: "age",
        label: "Alder",
        type: "number",
        placeholder: "18",
        required: true,
        min: 15,
      },
    ],
  },
    {
    id: "cc",
    name: "Content Creator Ansøgning",
    description: "Ansøg om at blive en del af vores content creator team",
    requiredRole: "1427634628742615171", // Erstat med din Discord rolle ID
    fields: [
      {
        id: "age",
        label: "Alder",
        type: "number",
        placeholder: "18",
        required: true,
        min: 15,
      },
    ],
  },
    
  {
    id: "Betatester",
    name: "Beta Tester Ansøgning",
    description: "Ansøg om at blive en del af vores beta tester team",
    requiredRole: "1427687620502225077", // Erstat med din Discord rolle ID
    fields: [
      {
        id: "hvor_kan_bande_regler_findes",
        label: "Hvor kan Division bande regelsæt findes?",
        type: "textarea",
        placeholder: "Fortæl os hvor du kan finde Division bande regelsæt...",
        required: true,
        rows: 1,
      },
    ],
  },
    {
    id: "bande",
    name: "Bande Ansøgning",
    description: "Ansøg om at blive en bande på serveren.",
    requiredRole: "1427634558718971974", // Erstat med din Discord rolle ID
    fields: [
      {
        id: "hvor_kan_bande_regler_findes",
        label: "Hvor kan Division bande regelsæt findes?",
        type: "textarea",
        placeholder: "Fortæl os hvor du kan finde Division bande regelsæt...",
        required: true,
        rows: 1,
      },
      {
        id: "bande_navn",
        label: "Navn på banden?",
        type: "textarea",
        placeholder: "Fortæl os navnet på din bande...",
        required: true,
        rows: 1,
      },
      {
        id: "medlemsliste",
        label: "Medlemsliste (Discord, ingame navn, alder & steam link inkluderet)?",
        type: "textarea",
        placeholder: "grisenw - Abdi Hassan - 31 - steamlink",
        required: true,
        rows: 25,
      },
      {
        id: "baggrund",
        label: "En baggrund for jeres bande, hvordan er den opstået og hvad er jeres formål?",
        type: "textarea",
        placeholder: "Giv os en baggrund for jeres bande...",
        required: true,
        rows: 10,
      },
      {
        id: "rekrutterings_beskrivelse",
        label: "Beskrivelse på hvordan i rekruttere nye medlemmer?",
        type: "textarea",
        placeholder: "Giv os en beskrivelse på hvordan i rekruttere nye medlemmer...",
        required: true,
        rows: 10,
      },
      {
        id: "lokation",
        label: "Hvilken lokation har jeres bande lyst til at opkøbe som bande grund?",
        type: "textarea",
        placeholder: "Hvis I ønsker at benytte billede til at beskrive jeres lokation, så upload det til en billede hjemmeside, såsom Imgur eller Gyazo og så del linket nedenfor.",
        required: true,
        rows: 5,
      },
      {
        id: "dresscode",
        label: "Har I en bestemt dresscode?",
        type: "textarea",
        placeholder: "Hvis I ønsker at benytte billede til at beskrive jeres dresscode, så upload det til en billede hjemmeside, såsom Imgur eller Gyazo og så del linket nedenfor.",
        required: true,
        rows: 5,
      },
    ],
  },
  {
    id: "wlmodtager",
    name: "Whitelist Modtager",
    description: "Ansøg om at blive whitelist modtager",
    requiredRole: "1427634524673544232", // Erstat med din Discord rolle ID
    fields: [
      {
        id: "age",
        label: "Alder",
        type: "number",
        placeholder: "18",
        required: true,
        min: 15,
      },
    ],
  },
  {
    id: "whitelist",
    name: "Whitelist Ansøgning",
    description: "Ansøg om whitelist til serveren",
    requiredRole: "1425185680065298523", // Erstat med din Discord rolle ID
    fields: [
      {
        id: "alder",
        label: "IRL Alder",
        type: "number",
        placeholder: "18",
        required: true,
        min: 18,
      },
      {
        id: "karakter_navn",
        label: "Karakter Navn",
        type: "text",
        placeholder: "Vekå Larsen",
        required: true,
      },
      {
        id: "karakter_alder",
        label: "Karakterens Alder",
        type: "number",
        placeholder: "18",
        required: true,
        min: 18,
      },
      {
        id: "hvorfor_division",
        label: "Hvorfor ansøger du til Division?",
        type: "textarea",
        placeholder: "Fortæl os hvorfor du ansøger til Division...",
        required: true,
        rows: 6,
      },
      {
        id: "timer_og_servere",
        label: "FiveM timer & servere",
        type: "textarea",
        placeholder: "Skriv antal timer og servere",
        required: true,
        rows: 3,
      },
    ],
  },
]
