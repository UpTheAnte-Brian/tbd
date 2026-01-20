-- MDE reference lists (localized)
-- Safe to run multiple times.

-- ---------------------------------------------------------
-- 1) Organization Types
-- ---------------------------------------------------------
create table if not exists public.mde_org_types (
  code text primary key,
  description text not null,
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_mde_org_types_updated_at on public.mde_org_types;
create trigger trg_mde_org_types_updated_at
before update on public.mde_org_types
for each row execute function public.set_updated_at();

insert into public.mde_org_types (code, description) values
('01','Independent Districts and Schools'),
('02','Common Districts and Schools'),
('03','Special Districts and Schools'),
('04','Technical Colleges and Campuses'),
('05','Reserved (historical)'),
('06','Intermediate Districts and Schools'),
('07','Charter Schools'),
('08','State Operated Integration Magnet School'),
('09','Assessment Vendor Testing'),
('21','Community Colleges'),
('22','State Universities'),
('23','University of Minnesota system'),
('24','Private Colleges'),
('25','Combined Community / Technical Colleges'),
('26','Non-Profit Program Provider'),
('31','Nonpublic Schools in Independent Districts'),
('32','Nonpublic Schools in Common Districts'),
('33','Nonpublic Schools in Special Districts'),
('34','Tribally-Controlled Schools'),
('35','Reserved'),
('36','Nonpublic Archdiocese'),
('38','South Dakota School Districts'),
('39','Reserved (historical)'),
('50','Miscellaneous Cooperatives'),
('51','Vocational Cooperatives'),
('52','Special Education Cooperatives'),
('53','Vocational and Special Education Cooperatives'),
('54','Carl Perkins Consortium'),
('60','Correctional Facilities'),
('61','Education Districts'),
('62','Secondary Facilities Cooperatives'),
('70','State Operated Schools (Minnesota State Academies, Perpich)'),
('75','Residential Facilities - Neglected/Delinquent'),
('77','PAYS System Reserved (historical)'),
('78','Child Nutrition'),
('79','Child Nutrition Reserved'),
('80','Adult Basic Education (ABE)-Non-School Entity'),
('81','Economic Development Region'),
('82','Regional Management Information Center RMIC (ESV)'),
('83','Service Cooperative (ECSU Region)'),
('84','Non-Profit Organizations'),
('85','Grantees'),
('86','Academic Libraries'),
('87','Public School Libraries/Media Centers'),
('88','Special Libraries'),
('89','Public Libraries'),
('90','State Departments'),
('91','County Record (Auditors)'),
('92','State Agencies, Boards, and Councils'),
('93','Minnesota Educational Associations'),
('98','Out-of-State Districts'),
('99','Agency Access Management Records')
on conflict (code) do update
set description = excluded.description,
    updated_at = now();


-- ---------------------------------------------------------
-- 2) School Classifications
-- ---------------------------------------------------------
create table if not exists public.mde_school_class_types (
  code text primary key,
  description text not null,
  short_description text null,
  program_school text null, -- 'Program' / 'School' / 'None' from the reference list
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_mde_school_class_types_updated_at on public.mde_school_class_types;
create trigger trg_mde_school_class_types_updated_at
before update on public.mde_school_class_types
for each row execute function public.set_updated_at();

insert into public.mde_school_class_types (code, description, short_description, program_school) values
('0','Unassigned classification','Unassigned','None'),
('10','Elementary School (Grades PK-6)','Elementary School',null),
('20','Middle School (Grades 5-8)','Middle School','School'),
('31','Junior High School (Grades 7-8 or 7-9)','Junior High School',null),
('32','Senior High School (Grades 9-12)','Senior High School',null),
('33','Secondary School (Grades 7-12)','Secondary School','School'),
('40','Elementary/Secondary Combined (Grades K-12 limited to District Type 34 Tribally-Controlled Schools)','Combined School','School'),
('41','Public Area Learning Center ALC (State-approved)','Area Learning Center','School'),
('42','Public Alternative Learning Program ALP (State-approved)','Alternative Learning Program','Program'),
('43','Contract Alternative Program (State-approved)','Contract Alternative Program','Program'),
('44','Reserved','Reserved','None'),
('45','Targeted Services Program, ALC for Grades K-08 (State-approved)','Targeted Services Program','Program'),
('46','Organization-run Online Instruction (100% Virtual and/or State-Approved Supplemental)','Online Learning Instruction','Program'),
('50','Special Education','Special Education','None'),
('51','Special Education ESY (Extended School Year)','Special Education ESY','None'),
('55','Combined Special Education and Secondary Vocational Education Program','Special Education/Vocational','Program'),
('60','Secondary Vocational Program','Secondary Vocational Program',null),
('70','Delinquent Student/Correctional Program','Delinquent/Correctional Program','Program'),
('71','Miscellaneous Program (assignment is now limited)','Miscellaneous Program','Program'),
('72','Neglected Student Program, Title I','Neglected Student Program','Program'),
('73','Homeless Student Program, Title I','Homeless Student Program','Program'),
('74','Hospital/Medical/Partial Hospitalization Program','Hospital/Medical Program','Program'),
('75','Telecommunications','Telecommunications','None'),
('76','Educational Oversight to Private Residential Care & Treatment (State-approved)','Oversight to Residential Care','None'),
('77','Educational Oversight to Public Residential Care & Treatment (State-approved)','Oversight to Residential Care','None'),
('78','Educational Oversight to Private Care and Treatment Day Program','Oversight to Private Care and Treatment Day Program','Program'),
('79','Educational Oversight to Public Care and Treatment Day Program','Oversight to Public Care and Treatment Day Program','Program'),
('80','Technical Colleges (PSEO)','Technical Colleges (PSEO)','Program'),
('81','Postsecondary School/Program','Postsecondary Program','Program'),
('82','Community and Adult Education Program','Community/Adult Education','Program'),
('83','Early Childhood Screening','Early Childhood Screening','Program'),
('84','Parenting Education (ECFE)','Parenting Education (ECFE)','Program'),
('85','Prekindergarten/Preschool (School Readiness)','Prekindergarten/Preschool (School Readiness)','Program'),
('90','Administrative Program','Administrative Program','Program'),
('99','Not used anymore','Not used anymore','None')
on conflict (code) do update
set description = excluded.description,
    short_description = excluded.short_description,
    program_school = excluded.program_school,
    updated_at = now();


-- ---------------------------------------------------------
-- 3) States and Provinces
-- ---------------------------------------------------------
create table if not exists public.mde_states (
  code text primary key,
  name text not null,
  fips_code int null,
  country text null,
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_mde_states_updated_at on public.mde_states;
create trigger trg_mde_states_updated_at
before update on public.mde_states
for each row execute function public.set_updated_at();

-- Minimal seed: US states + DC + common US territories + Canadian provinces listed by MDE.
-- (You can extend/replace this list later; upserts make it safe.)
insert into public.mde_states (code, name, fips_code, country) values
('AL','Alabama',1,'US'),
('AK','Alaska',2,'US'),
('AZ','Arizona',4,'US'),
('AR','Arkansas',5,'US'),
('CA','California',6,'US'),
('CO','Colorado',8,'US'),
('CT','Connecticut',9,'US'),
('DE','Delaware',10,'US'),
('DC','District of Columbia',11,'US'),
('FL','Florida',12,'US'),
('GA','Georgia',13,'US'),
('HI','Hawaii',15,'US'),
('ID','Idaho',16,'US'),
('IL','Illinois',17,'US'),
('IN','Indiana',18,'US'),
('IA','Iowa',19,'US'),
('KS','Kansas',20,'US'),
('KY','Kentucky',21,'US'),
('LA','Louisiana',22,'US'),
('ME','Maine',23,'US'),
('MD','Maryland',24,'US'),
('MA','Massachusetts',25,'US'),
('MI','Michigan',26,'US'),
('MN','Minnesota',27,'US'),
('MS','Mississippi',28,'US'),
('MO','Missouri',29,'US'),
('MT','Montana',30,'US'),
('NE','Nebraska',31,'US'),
('NV','Nevada',32,'US'),
('NH','New Hampshire',33,'US'),
('NJ','New Jersey',34,'US'),
('NM','New Mexico',35,'US'),
('NY','New York',36,'US'),
('NC','North Carolina',37,'US'),
('ND','North Dakota',38,'US'),
('OH','Ohio',39,'US'),
('OK','Oklahoma',40,'US'),
('OR','Oregon',41,'US'),
('PA','Pennsylvania',42,'US'),
('RI','Rhode Island',44,'US'),
('SC','South Carolina',45,'US'),
('SD','South Dakota',46,'US'),
('TN','Tennessee',47,'US'),
('TX','Texas',48,'US'),
('UT','Utah',49,'US'),
('VT','Vermont',50,'US'),
('VA','Virginia',51,'US'),
('WA','Washington',53,'US'),
('WV','West Virginia',54,'US'),
('WI','Wisconsin',55,'US'),
('WY','Wyoming',56,'US'),
('AS','American Samoa',60,'US'),
('GU','Guam',66,'US'),
('PR','Puerto Rico',72,'US'),
('VI','Virgin Islands',78,'US'),
-- Canada (as listed by MDE)
('AB','Alberta',null,'CA'),
('BC','British Columbia',null,'CA'),
('MB','Manitoba',null,'CA'),
('NB','New Brunswick',null,'CA'),
('NL','Newfoundland And Labrador',null,'CA'),
('NT','North West Territories',null,'CA'),
('NS','Nova Scotia',null,'CA'),
('NU','Nunavut',null,'CA'),
('ON','Ontario',null,'CA'),
('PE','Prince Edward Island',null,'CA'),
('QC','Quebec',null,'CA'),
('SK','Saskatchewan',null,'CA'),
('YT','Yukon',null,'CA')
on conflict (code) do update
set name = excluded.name,
    fips_code = excluded.fips_code,
    country = excluded.country,
    updated_at = now();