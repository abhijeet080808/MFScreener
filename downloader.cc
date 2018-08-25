#include <boost/date_time/gregorian/gregorian.hpp>

#include <dirent.h>
#include <fstream>
#include <iostream>
#include <map>
#include <string>
#include <vector>

using namespace std;

class MutualFundData
{
public:
  MutualFundData(double nav)
    : mNav(nav),
      mOneYrCagr(0),
      mThreeYrCagr(0),
      mFiveYrCagr(0),
      mOneYrAvg(0),
      mThreeYrAvg(0),
      mFiveYrAvg(0),
      mOneYrStdDev(0),
      mThreeYrStdDev(0),
      mFiveYrStdDev(0)
  {
  }

public:
  double mNav;
  double mOneYrCagr;
  double mThreeYrCagr;
  double mFiveYrCagr;
  double mOneYrAvg;
  double mThreeYrAvg;
  double mFiveYrAvg;
  double mOneYrStdDev;
  double mThreeYrStdDev;
  double mFiveYrStdDev;
};

class MutualFund
{
public:
  MutualFund(long code,
             const string& name,
             const boost::gregorian::date& date,
             const MutualFundData& data)
    : mCode(code),
      mName(name)
  {
    mData.insert(make_pair(date, data));
  }

public:
  long mCode;
  string mName;
  map<boost::gregorian::date, MutualFundData> mData;
};

vector<string> GetNavFileNames(const string& parentDir)
{
  vector<string> file_names;

  struct dirent* dir;
  DIR* dirp = opendir(parentDir.c_str());

  if (dirp)
  {
    while ((dir = readdir(dirp)) != 0)
    {
      if (strcmp(dir->d_name, ".") && strcmp(dir->d_name, ".."))
      {
        file_names.push_back(parentDir + "/" + dir->d_name);
      }
    }

    closedir(dirp);
  }

  return file_names;
}

vector<string> Split(const string& str, const string& delimiter)
{
  size_t pos_start = 0, pos_end, delim_len = delimiter.length();

  string token;
  vector<string> res;

  while ((pos_end = str.find(delimiter, pos_start)) != string::npos)
  {
    token = str.substr(pos_start, pos_end - pos_start);
    pos_start = pos_end + delim_len;
    res.push_back(token);
  }

  res.push_back(str.substr(pos_start));
  return res;
}

map<long, MutualFund> ReadNavFiles(const vector<string>& fileNames)
{
  map<long, MutualFund> mutual_funds;
  int num_nav = 0;

  cout << "Reading " << fileNames.size() << " NAV files" << endl;

  for (size_t i = 0; i < fileNames.size(); ++i)
  {
    ifstream in(fileNames.at(i).c_str());
    string line;

    cout << " [" << (i + 1) << "/" << fileNames.size() << "]"
         << " Reading " << fileNames.at(i) << endl;

    while (getline(in, line))
    {
      if (line.size() > 0)
      {
        vector<string> fields = Split(line, ";");
        if (fields.size() == 6 &&
            !fields.at(0).empty() && // code
            !fields.at(1).empty() && // name
            !fields.at(2).empty() && // nav
            !fields.at(5).empty())   // date
        {
          long code;
          string name;
          double nav_value;
          boost::gregorian::date nav_date;

          try
          {
            // silently fail
            if (fields.at(0) == "Scheme Code")
            {
              continue;
            }

            // silently fail
            if (fields.at(2) == "NA" ||
                fields.at(2) == "N.A." ||
                fields.at(2) == "N/A" ||
                fields.at(2) == "#N/A" ||
                fields.at(2) == "#DIV/0!" ||
                fields.at(2) == "B.C." ||
                fields.at(2) == "B. C." ||
                fields.at(2) == "-")
            {
              continue;
            }

            // remove leading and trailing whitespaces
            fields.at(0).erase(0, fields.at(0).find_first_not_of(" \t\r\n"));
            fields.at(0).erase(fields.at(0).find_last_not_of(" \t\r\n") + 1);
            fields.at(1).erase(0, fields.at(1).find_first_not_of(" \t\r\n"));
            fields.at(1).erase(fields.at(1).find_last_not_of(" \t\r\n") + 1);
            fields.at(2).erase(0, fields.at(2).find_first_not_of(" \t"));
            fields.at(2).erase(fields.at(2).find_last_not_of(" \t") + 1);
            fields.at(5).erase(0, fields.at(5).find_first_not_of(" \t\r\n"));
            fields.at(5).erase(fields.at(5).find_last_not_of(" \t\r\n") + 1);

            // remove " and ' from name
            fields.at(1).erase(remove(fields.at(1).begin(),
                                      fields.at(1).end(),
                                      '\"'),
                               fields.at(1).end());
            fields.at(1).erase(remove(fields.at(1).begin(),
                                      fields.at(1).end(),
                                      '\''),
                               fields.at(1).end());

            // remove comma from nav
            fields.at(2).erase(remove(fields.at(2).begin(),
                                      fields.at(2).end(),
                                      ','),
                               fields.at(2).end());

            if (fields.at(0).find_first_not_of("0123456789") !=
                std::string::npos)
            {
              throw exception();
            }

            if (fields.at(2).find_first_not_of("0123456789.") !=
                std::string::npos)
            {
              throw exception();
            }

            code = stol(fields.at(0));
            name = fields.at(1);
            nav_value = stod(fields.at(2));

            vector<string> dates = Split(fields.at(5), "-");

            if (dates.size() != 3)
            {
              throw exception();
            }

            if (dates.at(0).find_first_not_of("0123456789") !=
                std::string::npos)
            {
              throw exception();
            }

            if (dates.at(2).find_first_not_of("0123456789") !=
                std::string::npos)
            {
              throw exception();
            }

            // yyyy, mmm, dd
            nav_date = boost::gregorian::date(
                stoi(dates.at(2)),
                boost::date_time::month_str_to_ushort<
                    boost::gregorian::greg_month>(dates[1]),
                stoi(dates.at(0)));

            // silently fail
            if (nav_value == 0)
            {
              continue;
            }
          }
          catch (const exception& e)
          {
            cout << "Dropping: " << line << endl;
            continue;
          }

          if (mutual_funds.find(code) == mutual_funds.end())
          {
            MutualFund mf(code, name, nav_date, MutualFundData(nav_value));
            mutual_funds.insert(make_pair(code, mf));
          }
          else
          {
            mutual_funds.at(code).mName = name;
            mutual_funds.at(code).mData.insert(
                make_pair(nav_date, MutualFundData(nav_value)));
          }

          num_nav++;
        }
      }
    }

    in.close();
  }

  cout << "Read " << mutual_funds.size() << " mutual funds and "
       << num_nav << " NAVs" << endl;

  return mutual_funds;
}

void AddMissingDates(map<long, MutualFund>& mutualFunds)
{
  int added_navs = 0;

  cout << "Cleaning " << mutualFunds.size() << " mutual funds" << endl;

  for (auto& mfKv : mutualFunds)
  {
    double last_valid_nav = mfKv.second.mData.begin()->second.mNav;

    for (boost::gregorian::date d = mfKv.second.mData.begin()->first;
         d <= mfKv.second.mData.rbegin()->first;
         d += boost::gregorian::date_duration(1))
    {
      if (mfKv.second.mData.find(d) == mfKv.second.mData.end())
      {
        // for missing date, use the last read nav
        mfKv.second.mData.insert(make_pair(d, MutualFundData(last_valid_nav)));
        added_navs++;
      }
      else
      {
        last_valid_nav = mfKv.second.mData.at(d).mNav;
      }
    }
  }

  cout << "Cleaned " << mutualFunds.size() << " mutual funds"
       << " and added " << added_navs << " NAVs" << endl;
}

void CalculateStatistics(map<long, MutualFund>& mutualFunds)
{
  // cagr = ((final_value / initial_value)^(1 / number of periods) - 1) x 100
  // std_dev = ((sum of [(actual - mean)^2]) / N)^(1/2)

  cout << "Calculating statistics for " << mutualFunds.size()
       << " mutual funds" << endl;

  for (auto& mfKv : mutualFunds)
  {
    double one_year_rolling_total = 0;
    double three_year_rolling_total = 0;
    double five_year_rolling_total = 0;

    for (auto& dataKv : mfKv.second.mData)
    {
      boost::gregorian::date date_today = dataKv.first;
      double nav_today = dataKv.second.mNav;

      boost::gregorian::date one_yr_ago = date_today -
        boost::gregorian::date_duration(364);
      boost::gregorian::date three_yr_ago = date_today -
        boost::gregorian::date_duration(1094);
      boost::gregorian::date five_yr_ago = date_today -
        boost::gregorian::date_duration(1824);

      one_year_rolling_total += nav_today;
      three_year_rolling_total += nav_today;
      five_year_rolling_total += nav_today;

      if (mfKv.second.mData.find(one_yr_ago) != mfKv.second.mData.end())
      {
        double nav_one_yr_ago = mfKv.second.mData.at(one_yr_ago).mNav;

        double cagr =
          (pow((nav_today / nav_one_yr_ago), 1.0f/1.0f) - 1) * 100.0f;
        dataKv.second.mOneYrCagr = cagr;

        dataKv.second.mOneYrAvg = one_year_rolling_total / 365.0f;
        one_year_rolling_total -= nav_one_yr_ago;

        double squared_diff_total = 0;
        for (boost::gregorian::date d = one_yr_ago;
             d <= date_today;
             d += boost::gregorian::date_duration(1))
        {
          squared_diff_total +=
            pow(mfKv.second.mData.at(d).mNav - dataKv.second.mOneYrAvg, 2);
        }
        dataKv.second.mOneYrStdDev = pow(squared_diff_total / 365.0f, 0.5f);
      }
      else
      {
        continue;
      }

      if (mfKv.second.mData.find(three_yr_ago) != mfKv.second.mData.end())
      {
        double nav_three_yr_ago = mfKv.second.mData.at(three_yr_ago).mNav;

        double cagr =
          (pow((nav_today / nav_three_yr_ago), 1.0f/3.0f) - 1) * 100.0f;
        dataKv.second.mThreeYrCagr = cagr;

        dataKv.second.mThreeYrAvg = three_year_rolling_total / 1095.0f;
        three_year_rolling_total -= nav_three_yr_ago;

        double squared_diff_total = 0;
        for (boost::gregorian::date d = three_yr_ago;
             d <= date_today;
             d += boost::gregorian::date_duration(1))
        {
          squared_diff_total +=
            pow(mfKv.second.mData.at(d).mNav - dataKv.second.mThreeYrAvg, 2);
        }
        dataKv.second.mThreeYrStdDev = pow(squared_diff_total / 1095.0f, 0.5f);
      }
      else
      {
        continue;
      }

      if (mfKv.second.mData.find(five_yr_ago) != mfKv.second.mData.end())
      {
        double nav_five_yr_ago = mfKv.second.mData.at(five_yr_ago).mNav;

        double cagr =
          (pow((nav_today / nav_five_yr_ago), 1.0f/5.0f) - 1) * 100.0f;
        dataKv.second.mFiveYrCagr = cagr;

        dataKv.second.mFiveYrAvg = five_year_rolling_total / 1825.0f;
        five_year_rolling_total -= nav_five_yr_ago;

        double squared_diff_total = 0;
        for (boost::gregorian::date d = five_yr_ago;
             d <= date_today;
             d += boost::gregorian::date_duration(1))
        {
          squared_diff_total +=
            pow(mfKv.second.mData.at(d).mNav - dataKv.second.mFiveYrAvg, 2);
        }
        dataKv.second.mFiveYrStdDev = pow(squared_diff_total / 1825.0f, 0.5f);
      }
    }
  }

  cout << "Calculated statistics for " << mutualFunds.size()
       << " mutual funds" << endl;
}

void WriteToCsv(map<long, MutualFund>& mutualFunds, const string& directory)
{
  cout << "Writing CSVs for " << mutualFunds.size()
       << " mutual funds" << endl;

  for (auto& mfKv : mutualFunds)
  {
    string file_name = directory + "/" + to_string(mfKv.second.mCode) + ".csv";
    ofstream out(file_name.c_str());

    for (auto& dataKv : mfKv.second.mData)
    {
      out << fixed << setprecision(4)
          << to_iso_extended_string(dataKv.first) << ","
          << dataKv.second.mNav << ",";

      if (dataKv.second.mOneYrCagr != 0)
      {
        out << dataKv.second.mOneYrCagr;
      }
      out << ",";

      if (dataKv.second.mThreeYrCagr != 0)
      {
        out << dataKv.second.mThreeYrCagr;
      }
      out << ",";

      if (dataKv.second.mFiveYrCagr != 0)
      {
        out << dataKv.second.mFiveYrCagr;
      }
      out << ",";

      if (dataKv.second.mOneYrAvg != 0)
      {
        out << dataKv.second.mOneYrAvg;
      }
      out << ",";

      if (dataKv.second.mThreeYrAvg != 0)
      {
        out << dataKv.second.mThreeYrAvg;
      }
      out << ",";

      if (dataKv.second.mFiveYrAvg != 0)
      {
        out << dataKv.second.mFiveYrAvg;
      }
      out << ",";

      if (dataKv.second.mOneYrStdDev != 0)
      {
        out << dataKv.second.mOneYrStdDev;
      }
      out << ",";

      if (dataKv.second.mThreeYrStdDev != 0)
      {
        out << dataKv.second.mThreeYrStdDev;
      }
      out << ",";

      if (dataKv.second.mFiveYrStdDev != 0)
      {
        out << dataKv.second.mFiveYrStdDev;
      }

      out << endl;
    }

    out.close();
  }

  string file_name = directory + "/mf_code_names.csv";
  ofstream out(file_name.c_str());

  for (auto& mfKv : mutualFunds)
  {
    out << to_string(mfKv.first) << ","
        << mfKv.second.mName
        << endl;
  }

  out.close();

  cout << "Wrote CSVs for " << mutualFunds.size()
       << " mutual funds" << endl;
}

int main()
{
  vector<string> file_names = GetNavFileNames("nav");
  map<long, MutualFund> mutual_funds = ReadNavFiles(file_names);
  AddMissingDates(mutual_funds);
  CalculateStatistics(mutual_funds);
  WriteToCsv(mutual_funds, "static/csv");
}
