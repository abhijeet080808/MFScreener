#include <boost/date_time/gregorian/gregorian.hpp>

#include <cassert>
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
      mOneYrVarSum(0),
      mThreeYrVarSum(0),
      mFiveYrVarSum(0)
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
  // https://www.mathsisfun.com/data/standard-deviation.html
  // std_dev = sqrt(var_sum/size)
  double mOneYrVarSum;
  double mThreeYrVarSum;
  double mFiveYrVarSum;
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

  int i = 0;
  for (auto& mfKv : mutualFunds)
  {
    ++i;
    if (i % 1000 == 0)
    {
      cout << "[" << (i + 1) << "/" << mutualFunds.size() << "]"
           << " Cleaning..." << endl;
    }

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

unique_ptr<double>
CalculateCagr(const map<boost::gregorian::date, MutualFundData>& mfData,
              const boost::gregorian::date& presentDate,
              int daysAgo)
{
  boost::gregorian::date old_date = presentDate -
    boost::gregorian::date_duration(daysAgo);

  if (mfData.find(old_date) != mfData.end())
  {
    double present_nav = mfData.at(presentDate).mNav;
    double old_nav = mfData.at(old_date).mNav;
    double cagr = (pow((present_nav / old_nav), 365.0f/daysAgo) - 1) * 100.0f;
    return unique_ptr<double>(new double(cagr));
  }
  return nullptr;
}

tuple<bool, double, double>
CalculateAverageAndVarianceSum(
    const map<boost::gregorian::date, MutualFundData>& mfData,
    const boost::gregorian::date& presentDate,
    double& rollingNavTotal,
    double& prevVarSum,
    double& prevAverageNav,
    int windowDays)
{
  boost::gregorian::date first_date = presentDate -
    boost::gregorian::date_duration(windowDays - 1);

  if (mfData.find(first_date) != mfData.end())
  {
    double first_nav = mfData.at(first_date).mNav;

    double average_nav = rollingNavTotal / windowDays;

    rollingNavTotal -= first_nav;

    // first run
    double var_sum;
    if (prevVarSum == 0)
    {
      double squared_diff_total = 0;
      boost::gregorian::date temp_date;
      for (temp_date = first_date;
           temp_date <= presentDate;
           temp_date += boost::gregorian::date_duration(1))
      {
        squared_diff_total +=
          pow(mfData.at(temp_date).mNav - average_nav, 2);
      }
      var_sum = squared_diff_total;
    }
    else
    {
      var_sum = prevVarSum +
        ((mfData.at(presentDate).mNav -
          mfData.at(first_date - boost::gregorian::date_duration(1)).mNav) *
         (mfData.at(presentDate).mNav - average_nav +
          mfData.at(first_date - boost::gregorian::date_duration(1)).mNav -
          prevAverageNav));
    }

    prevAverageNav = average_nav;
    prevVarSum = var_sum;

    return make_tuple(true, var_sum, average_nav);
  }

  return make_tuple(false, 0, 0);
}


void CalculateStatistics(map<long, MutualFund>& mutualFunds)
{
  // cagr = ((final_value / initial_value)^(1 / number of periods) - 1) x 100
  // std_dev = ((sum of [(actual - mean)^2]) / (N - 1))^(1/2)
  // http://jonisalonen.com/2014/efficient-and-accurate-rolling-standard-deviation/
  // variance_sum = prev_variance_sum +
  //   (newest_val - oldest_val_just_outside_window) *
  //   (newest_val - new_avg + oldest_val_just_outside_window - prev_avg)

  cout << "Calculating statistics for " << mutualFunds.size()
       << " mutual funds" << endl;

  int i = 0;
  for (auto& mfKv : mutualFunds)
  {
    ++i;
    if (i % 1000 == 0)
    {
      cout << "[" << (i + 1) << "/" << mutualFunds.size() << "]"
           << " Calculating..." << endl;
    }

    double one_year_rolling_total = 0;
    double three_year_rolling_total = 0;
    double five_year_rolling_total = 0;

    double prev_one_yr_avg = 0;
    double prev_three_yr_avg = 0;
    double prev_five_yr_avg = 0;

    double prev_one_yr_var_sum = 0;
    double prev_three_yr_var_sum = 0;
    double prev_five_yr_var_sum = 0;

    for (auto& dataKv : mfKv.second.mData)
    {
      if (auto cagr = CalculateCagr(mfKv.second.mData, dataKv.first, 365))
      {
        dataKv.second.mOneYrCagr = *cagr;
      }
      if (auto cagr = CalculateCagr(mfKv.second.mData, dataKv.first, 1095))
      {
        dataKv.second.mThreeYrCagr = *cagr;
      }
      if (auto cagr = CalculateCagr(mfKv.second.mData, dataKv.first, 1825))
      {
        dataKv.second.mFiveYrCagr = *cagr;
      }

      double nav_today = dataKv.second.mNav;
      one_year_rolling_total += nav_today;
      three_year_rolling_total += nav_today;
      five_year_rolling_total += nav_today;

      auto resOne = CalculateAverageAndVarianceSum(mfKv.second.mData,
                                                   dataKv.first,
                                                   one_year_rolling_total,
                                                   prev_one_yr_var_sum,
                                                   prev_one_yr_avg,
                                                   365);
      if (get<0>(resOne))
      {
        dataKv.second.mOneYrVarSum = get<1>(resOne);
        dataKv.second.mOneYrAvg = get<2>(resOne);
      }

      auto resThree = CalculateAverageAndVarianceSum(mfKv.second.mData,
                                                     dataKv.first,
                                                     three_year_rolling_total,
                                                     prev_three_yr_var_sum,
                                                     prev_three_yr_avg,
                                                     1095);
      if (get<0>(resThree))
      {
        dataKv.second.mThreeYrVarSum = get<1>(resThree);
        dataKv.second.mThreeYrAvg = get<2>(resThree);
      }

      auto resFive = CalculateAverageAndVarianceSum(mfKv.second.mData,
                                                    dataKv.first,
                                                    five_year_rolling_total,
                                                    prev_five_yr_var_sum,
                                                    prev_five_yr_avg,
                                                    1825);
      if (get<0>(resFive))
      {
        dataKv.second.mFiveYrVarSum = get<1>(resFive);
        dataKv.second.mFiveYrAvg = get<2>(resFive);
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

  int i = 0;
  for (auto& mfKv : mutualFunds)
  {
    ++i;
    if (i % 1000 == 0)
    {
      cout << "[" << (i + 1) << "/" << mutualFunds.size() << "]"
           << " Writing..." << endl;
    }

    string file_name = directory + "/" + to_string(mfKv.second.mCode) + ".csv";
    ofstream out(file_name.c_str());

    bool first_one_yr_cagr = false;
    bool first_three_yr_cagr = false;
    bool first_five_yr_cagr = false;
    bool first_one_yr_avg = false;
    bool first_three_yr_avg = false;
    bool first_five_yr_avg = false;
    bool first_one_yr_std_dev = false;
    bool first_three_yr_std_dev = false;
    bool first_five_yr_std_dev = false;

    for (auto& dataKv : mfKv.second.mData)
    {
      out << fixed << setprecision(4)
          << to_iso_extended_string(dataKv.first) << ","
          << dataKv.second.mNav << ",";

      if (dataKv.second.mOneYrCagr != 0 || first_one_yr_cagr)
      {
        out << dataKv.second.mOneYrCagr;
        first_one_yr_cagr = true;
      }
      out << ",";

      if (dataKv.second.mThreeYrCagr != 0 || first_three_yr_cagr)
      {
        out << dataKv.second.mThreeYrCagr;
        first_three_yr_cagr = true;
      }
      out << ",";

      if (dataKv.second.mFiveYrCagr != 0 || first_five_yr_cagr)
      {
        out << dataKv.second.mFiveYrCagr;
        first_five_yr_cagr = true;
      }
      out << ",";

      if (dataKv.second.mOneYrAvg != 0 || first_one_yr_avg)
      {
        out << dataKv.second.mOneYrAvg;
        first_one_yr_avg = true;
      }
      out << ",";

      if (dataKv.second.mThreeYrAvg != 0 || first_three_yr_avg)
      {
        out << dataKv.second.mThreeYrAvg;
        first_three_yr_avg = true;
      }
      out << ",";

      if (dataKv.second.mFiveYrAvg != 0 || first_five_yr_avg)
      {
        out << dataKv.second.mFiveYrAvg;
        first_five_yr_avg = true;
      }
      out << ",";

      if (dataKv.second.mOneYrVarSum != 0 || first_one_yr_std_dev)
      {
        out << pow(dataKv.second.mOneYrVarSum / 365.0f, 0.5f);
        first_one_yr_std_dev = true;
      }
      out << ",";

      if (dataKv.second.mThreeYrVarSum != 0 || first_three_yr_std_dev)
      {
        out << pow(dataKv.second.mThreeYrVarSum / 1095.0f, 0.5f);
        first_three_yr_std_dev = true;
      }
      out << ",";

      if (dataKv.second.mFiveYrVarSum != 0 || first_five_yr_std_dev)
      {
        out << pow(dataKv.second.mFiveYrVarSum / 1825.0f, 0.5f);
        first_five_yr_std_dev = true;
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
  const string nav_dir = "nav";
  const string csv_dir = "static/csv";

  vector<string> file_names = GetNavFileNames(nav_dir);
  map<long, MutualFund> mutual_funds = ReadNavFiles(file_names);
  AddMissingDates(mutual_funds);
  CalculateStatistics(mutual_funds);
  WriteToCsv(mutual_funds, csv_dir);
}
